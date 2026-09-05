package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.clean;
import static com.danang.motorescue.service.RescueJdbcSupport.getBoolean;

import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.CancelRequest;
import com.danang.motorescue.service.ActorService.Actor;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueCancellationService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final RescuePolicyProperties policy;
    private final CancellationPolicy cancellationPolicy;
    private final RescueRequestAccess access;
    private final RescueNotificationService notifications;

    public RescueCancellationService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            AuditService audit,
            RescuePolicyProperties policy,
            CancellationPolicy cancellationPolicy,
            RescueRequestAccess access,
            RescueNotificationService notifications) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
        this.policy = policy;
        this.cancellationPolicy = cancellationPolicy;
        this.access = access;
        this.notifications = notifications;
    }

    public void cancel(Actor actor, UUID requestId, CancelRequest input) {
        RescueRequestData current = access.requireParticipant(actor, requestId);
        boolean active = !List.of("completed", "cancelled").contains(current.status());
        boolean allowed = switch (actor.role()) {
            case "customer" -> current.customerId().equals(actor.id()) && List.of(
                    "searching", "offered", "assigned", "en_route", "awaiting_arrival_confirmation",
                    "no_provider", "needs_dispatch"
            ).contains(current.status());
            case "provider" -> false;
            case "dispatcher", "admin" -> active;
            default -> false;
        };
        if (!allowed) throw access.invalidAction();
        CancellationPolicy.Decision decision = cancellationPolicy.evaluate(
                actor.role(), current.status(), input.reasonCode(), input.note());
        Boolean providerNearPickup = decision.late() ? providerNearPickup(requestId) : null;
        String cancellationNote = clean(input.note());

        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET status = 'cancelled', cancellation_code = ?, cancellation_stage = ?,
                        cancellation_reason = ?, is_late_cancellation = ?,
                        provider_near_pickup_on_cancel = ?, cancelled_by = ?
                    WHERE id = ? AND status = ? AND version = ?
                    """, input.reasonCode(), decision.stage(), cancellationNote, decision.late(),
                    providerNearPickup, actor.id(), requestId, current.status(), input.expectedVersion());
            if (updated > 0) {
                jdbc.update("UPDATE public.dispatch_offers SET status = 'withdrawn' WHERE request_id = ? AND status = 'pending'", requestId);
                if (current.assignedProviderId() != null) {
                    jdbc.update("""
                            UPDATE public.provider_members
                            SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                                location_accuracy_m = NULL
                            WHERE user_id = ?
                            """, current.assignedProviderId());
                }
                String action = decision.arrivalDisputed()
                        ? "request.arrival_disputed_cancelled"
                        : decision.late() ? "request.late_cancelled_by_customer"
                        : "request.cancelled_by_" + actor.role();
                audit.record(actor.id(), action, "rescue_request", requestId);
                if ("dispatcher".equals(actor.role()) || "admin".equals(actor.role())) {
                    notifications.notifyParticipants(requestId, NotificationKind.REQUEST_CANCELLED, actor.role());
                } else {
                    notifications.notifyCounterparty(actor, requestId, NotificationKind.REQUEST_CANCELLED, actor.role());
                }
            }
            return updated;
        });
        if (changed == 0) throw access.stale();
    }

    private Boolean providerNearPickup(UUID requestId) {
        return jdbc.query("""
                SELECT CASE
                  WHEN checkpoint.recorded_at IS NULL
                    OR checkpoint.recorded_at < NOW() - (? * INTERVAL '1 second')
                    OR checkpoint.accuracy_m > ?
                  THEN NULL
                  ELSE extensions.ST_DWithin(
                    extensions.ST_SetSRID(
                      extensions.ST_MakePoint(checkpoint.longitude, checkpoint.latitude), 4326
                    )::extensions.geography,
                    request.pickup_location,
                    ?
                  )
                END AS provider_near_pickup
                FROM public.rescue_requests request
                LEFT JOIN LATERAL (
                  SELECT latitude, longitude, accuracy_m, recorded_at
                  FROM public.provider_location_checkpoints
                  WHERE request_id = request.id
                  ORDER BY recorded_at DESC
                  LIMIT 1
                ) checkpoint ON TRUE
                WHERE request.id = ?
                """, rs -> rs.next() ? getBoolean(rs, "provider_near_pickup") : null,
                policy.cancellationEvidenceMaxAge().toSeconds(), policy.arrivalProximityMeters(),
                policy.arrivalProximityMeters(), requestId);
    }
}

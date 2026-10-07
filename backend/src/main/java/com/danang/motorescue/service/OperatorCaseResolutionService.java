package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.CaseResolutionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OperatorCaseResolutionService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final RescueRequestAccess access;
    private final RescueNotificationService notifications;

    public OperatorCaseResolutionService(JdbcTemplate jdbc, TransactionTemplate transactions,
            RescueRequestAccess access, RescueNotificationService notifications) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.access = access;
        this.notifications = notifications;
    }

    public void resolve(Actor actor, UUID requestId, CaseResolutionRequest input) {
        CaseResolutionPolicy.requireAdmin(actor.role());
        transactions.executeWithoutResult(transaction -> {
            // Serialize against customer confirmation, rejection, cancellation and other admins.
            var current = jdbc.query("""
                    SELECT status, version FROM public.rescue_requests WHERE id = ? FOR UPDATE
                    """, rs -> rs.next() ? new Current(rs.getString("status"), rs.getInt("version")) : null,
                    requestId);
            if (current == null) throw new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND",
                    "Không tìm thấy ca cứu hộ.");
            CaseResolutionPolicy.validate(current.status(), current.version(), input);
            access.setActor(actor.id());
            if ("verified_completed".equals(input.decision())) {
                int changed = jdbc.update("""
                        UPDATE public.rescue_requests SET status = 'completed'
                        WHERE id = ? AND version = ? AND status = 'awaiting_completion'
                        """, requestId, input.expectedVersion());
                if (changed != 1) throw access.stale();
                jdbc.update("""
                        UPDATE public.provider_members
                        SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                            location_accuracy_m = NULL
                        WHERE user_id = (SELECT assigned_provider_id FROM public.rescue_requests WHERE id = ?)
                        """, requestId);
                CaseClosureSupport.resolveLifecycleFlags(jdbc, requestId, actor.id());
            }
            // Unverified is a recorded decision, NOT a terminal status. In particular, do not
            // reset updated_at: that would postpone the completion confirmation timeout.
            jdbc.update("""
                    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
                    SELECT ?, 'request.operator_resolution', 'rescue_request', CAST(id AS TEXT),
                           jsonb_build_object('decision', CAST(? AS TEXT), 'note', CAST(? AS TEXT),
                                              'requestVersion', version)
                    FROM public.rescue_requests WHERE id = ?
                    """, actor.id(), input.decision(), input.note().trim(), requestId);
            if ("verified_completed".equals(input.decision())) {
                notifications.notifyParticipants(requestId, NotificationKind.STATUS_CHANGED, "completed");
            }
        });
    }

    private record Current(String status, int version) {}
}

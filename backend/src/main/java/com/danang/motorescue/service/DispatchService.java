package com.danang.motorescue.service;

import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.service.RoadRoutingService.RoadRoute;
import com.danang.motorescue.service.RoadRoutingService.RoadPoint;
import com.danang.motorescue.web.ApiException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DispatchService {
    private record RequestPoint(UUID id, String status, String serviceCode, double latitude, double longitude) {}
    record Candidate(UUID providerId, UUID teamId, double latitude, double longitude) {}
    record Ranked(Candidate candidate, RoadRoute route) {}
    private record ExpiredRequest(UUID id, UUID customerId) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final RoadRoutingService routing;
    private final MatchingProperties properties;
    private final PushNotificationService push;

    public DispatchService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            RoadRoutingService routing,
            MatchingProperties properties,
            PushNotificationService push) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.routing = routing;
        this.properties = properties;
        this.push = push;
    }

    public void match(UUID requestId) {
        RequestPoint request = loadRequest(requestId);
        if (!"searching".equals(request.status())) return;

        List<Candidate> candidates = eligibleCandidates(request);
        if (candidates.isEmpty()) {
            markNoProvider(requestId, false);
            return;
        }

        List<Optional<RoadRoute>> routes = routing.routesToDestination(
                candidates.stream().map(candidate -> new RoadPoint(candidate.latitude(), candidate.longitude())).toList(),
                new RoadPoint(request.latitude(), request.longitude()));
        List<Ranked> ranked = new ArrayList<>();
        for (int index = 0; index < candidates.size(); index++) {
            Candidate candidate = candidates.get(index);
            routes.get(index).ifPresent(value -> ranked.add(new Ranked(candidate, value)));
        }
        List<Ranked> selected = selectFastest(ranked, properties.offerCount());

        if (selected.isEmpty()) {
            markNoProvider(requestId, true);
            return;
        }
        Boolean written = transactions.execute(status -> writeOffers(requestId, selected));
        if (!Boolean.TRUE.equals(written)) return;
        for (Ranked offer : selected) {
            push.notifyUser(offer.candidate().providerId(), NotificationKind.NEW_OFFER, null, requestId);
        }
    }

    static List<Ranked> selectFastest(List<Ranked> candidates, int limit) {
        return candidates.stream().sorted(Comparator
                .comparingInt((Ranked value) -> value.route().durationSeconds())
                .thenComparingInt(value -> value.route().distanceMeters())
                .thenComparing(value -> value.candidate().providerId()))
                .limit(Math.max(0, limit))
                .toList();
    }

    public void retry(UUID requestId) {
        int changed = jdbc.update("""
                UPDATE public.rescue_requests rr
                SET status = 'searching', routing_status = 'pending'
                FROM public.service_types service
                WHERE rr.id = ? AND rr.status = 'no_provider'
                  AND service.code = rr.service_code AND service.is_active
                """, requestId);
        if (changed == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_NOT_RETRYABLE", "Yêu cầu không ở trạng thái có thể tìm lại đội cứu hộ.");
        }
    }

    public void continueAfterDecline(UUID requestId) {
        int changed = jdbc.update("""
                UPDATE public.rescue_requests rr
                SET status = 'searching', routing_status = 'pending'
                WHERE rr.id = ? AND rr.status = 'offered'
                  AND NOT EXISTS (
                    SELECT 1 FROM public.dispatch_offers offer
                    WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at > NOW()
                  )
                """, requestId);
        if (changed > 0) match(requestId);
    }

    public void reassign(UUID requestId) {
        int changed = transactions.execute(status -> {
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET status = 'searching', assigned_team_id = NULL, assigned_provider_id = NULL,
                        road_distance_m = NULL, eta_minutes = NULL, routing_status = 'pending', work_type = NULL
                    WHERE id = ? AND status = 'needs_dispatch'
                    """, requestId);
            if (updated > 0) {
                jdbc.update("UPDATE public.quotes SET status = 'superseded' WHERE request_id = ? AND status = 'pending'",
                        requestId);
                jdbc.update("""
                        UPDATE public.case_attention_flags
                        SET status = 'resolved', resolved_at = NOW(), resolution_note = 'Điều phối viên đã tìm đội thay thế.'
                        WHERE request_id = ? AND status = 'open'
                        """, requestId);
            }
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_NOT_REASSIGNABLE",
                    "Ca không ở trạng thái cần điều phối lại.");
        }
    }

    public void expireOffers() {
        List<ExpiredRequest> expired = transactions.execute(status -> {
            jdbc.update("""
                    UPDATE public.dispatch_offers
                    SET status = 'expired', responded_at = NOW()
                    WHERE status = 'pending' AND expires_at <= NOW()
                    """);
            return jdbc.query("""
                    UPDATE public.rescue_requests rr
                    SET status = 'no_provider'
                    WHERE rr.status = 'offered'
                      AND NOT EXISTS (
                        SELECT 1 FROM public.dispatch_offers offer
                        WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at > NOW()
                      )
                    RETURNING rr.id, rr.customer_id
                    """, (rs, rowNum) -> new ExpiredRequest(
                    rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class)));
        });
        if (expired == null) return;
        for (ExpiredRequest request : expired) {
            push.notifyUser(request.customerId(), NotificationKind.NO_PROVIDER, null, request.id());
        }
    }

    private RequestPoint loadRequest(UUID requestId) {
        return Optional.ofNullable(jdbc.query("""
                        SELECT id, status, service_code, pickup_latitude, pickup_longitude
                        FROM public.rescue_requests WHERE id = ?
                        """, rs -> rs.next() ? new RequestPoint(
                        rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("service_code"),
                        rs.getDouble("pickup_latitude"), rs.getDouble("pickup_longitude")) : null, requestId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu cứu hộ."));
    }

    private List<Candidate> eligibleCandidates(RequestPoint request) {
        return jdbc.query("""
                SELECT pm.user_id, pm.team_id, pm.last_latitude, pm.last_longitude
                FROM public.provider_members pm
                JOIN public.rescue_teams team ON team.id = pm.team_id
                JOIN public.team_capabilities capability
                  ON capability.team_id = pm.team_id AND capability.service_code = ? AND capability.is_active
                JOIN public.rescue_requests rr ON rr.id = ?
                WHERE pm.status = 'active'
                  AND pm.is_available
                  AND team.status = 'verified'
                  AND pm.last_location IS NOT NULL
                  AND pm.location_accuracy_m IS NOT NULL
                  AND pm.location_accuracy_m <= ?
                  AND pm.location_updated_at >= NOW() - (? * INTERVAL '1 second')
                  AND extensions.ST_DWithin(pm.last_location, rr.pickup_location, team.service_radius_km * 1000)
                  AND NOT EXISTS (
                    SELECT 1 FROM public.rescue_requests active_request
                    WHERE active_request.assigned_provider_id = pm.user_id
                      AND active_request.status NOT IN ('completed', 'cancelled')
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM public.dispatch_offers previous_offer
                    WHERE previous_offer.request_id = rr.id
                      AND previous_offer.provider_id = pm.user_id
                      AND previous_offer.status = 'declined'
                  )
                ORDER BY pm.user_id
                """, (rs, rowNum) -> new Candidate(
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("team_id", UUID.class),
                        rs.getDouble("last_latitude"),
                        rs.getDouble("last_longitude")),
                request.serviceCode(), request.id(), properties.providerLocationMaxAccuracyMeters(),
                properties.providerLocationMaxAgeSeconds());
    }

    private boolean writeOffers(UUID requestId, List<Ranked> selected) {
        String current = jdbc.query("SELECT status FROM public.rescue_requests WHERE id = ? FOR UPDATE",
                rs -> rs.next() ? rs.getString(1) : null, requestId);
        if (!"searching".equals(current)) return false;

        jdbc.update("""
                UPDATE public.dispatch_offers SET status = 'withdrawn'
                WHERE request_id = ? AND status = 'pending'
                """, requestId);
        Instant expiresAt = Instant.now().plusSeconds(properties.offerTtlSeconds());
        for (Ranked item : selected) {
            jdbc.update("""
                    INSERT INTO public.dispatch_offers(
                      request_id, provider_id, team_id, road_distance_m, eta_seconds, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (request_id, provider_id) DO UPDATE SET
                      team_id = EXCLUDED.team_id,
                      status = 'pending',
                      road_distance_m = EXCLUDED.road_distance_m,
                      eta_seconds = EXCLUDED.eta_seconds,
                      offered_at = NOW(),
                      expires_at = EXCLUDED.expires_at,
                      responded_at = NULL
                    """, requestId, item.candidate().providerId(), item.candidate().teamId(),
                    item.route().distanceMeters(), item.route().durationSeconds(), Timestamp.from(expiresAt));
        }
        jdbc.update("""
                UPDATE public.rescue_requests SET status = 'offered', routing_status = 'road'
                WHERE id = ? AND status = 'searching'
                """, requestId);
        return true;
    }

    private void markNoProvider(UUID requestId, boolean routingUnavailable) {
        UUID customerId = jdbc.query("""
                UPDATE public.rescue_requests
                SET status = 'no_provider', routing_status = ?
                WHERE id = ? AND status = 'searching'
                RETURNING customer_id
                """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                routingUnavailable ? "unavailable" : "pending", requestId);
        if (customerId != null) {
            push.notifyUser(customerId, NotificationKind.NO_PROVIDER, null, requestId);
        }
    }
}

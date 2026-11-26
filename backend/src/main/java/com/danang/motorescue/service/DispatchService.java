package com.danang.motorescue.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DispatchService {
    private record RequestPoint(
            UUID id,
            String status,
            int version,
            String serviceCode,
            double latitude,
            double longitude,
            MatchingPolicy policy) {}

    record Candidate(
            UUID providerId,
            UUID teamId,
            double latitude,
            double longitude,
            int recentAcceptedCount,
            long waitingSeconds,
            int consecutiveSkips) {}

    record Ranked(Candidate candidate, RoadRoute route) {}
    private enum OfferResult { SENT, PROVIDER_UNAVAILABLE, REQUEST_CHANGED }

    record MatchingPolicy(
            int etaWindowSeconds,
            double etaWeight,
            double waitingWeight,
            double recentCasesWeight,
            int waitingReferenceSeconds,
            int recentWindowDays,
            int recentReferenceCases,
            int starvationSkipThreshold,
            int offerTtlSeconds) {
        MatchingPolicy {
            etaWindowSeconds = Math.max(60, Math.min(etaWindowSeconds, 3_600));
            double safeEtaWeight = safeWeight(etaWeight);
            double safeWaitingWeight = safeWeight(waitingWeight);
            double safeRecentCasesWeight = safeWeight(recentCasesWeight);
            double totalWeight = safeEtaWeight + safeWaitingWeight + safeRecentCasesWeight;
            if (totalWeight == 0) {
                etaWeight = 1;
                waitingWeight = 0;
                recentCasesWeight = 0;
            } else {
                etaWeight = safeEtaWeight / totalWeight;
                waitingWeight = safeWaitingWeight / totalWeight;
                recentCasesWeight = safeRecentCasesWeight / totalWeight;
            }
            waitingReferenceSeconds = Math.max(60, Math.min(waitingReferenceSeconds, 604_800));
            recentWindowDays = Math.max(1, Math.min(recentWindowDays, 90));
            recentReferenceCases = Math.max(1, Math.min(recentReferenceCases, 1_000));
            starvationSkipThreshold = Math.max(1, Math.min(starvationSkipThreshold, 100));
            offerTtlSeconds = Math.max(20, Math.min(offerTtlSeconds, 180));
        }

        private static double safeWeight(double weight) {
            return Double.isFinite(weight) ? Math.max(0, Math.min(weight, 1)) : 0;
        }
    }

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final RoadRoutingService routing;
    private final PushNotificationService push;
    private final int searchWaitSeconds;

    public DispatchService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            RoadRoutingService routing,
            PushNotificationService push,
            @Value("${app.matching.search-wait-seconds}") int searchWaitSeconds) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.routing = routing;
        this.push = push;
        if (searchWaitSeconds < 0) throw new IllegalArgumentException("search-wait-seconds must be non-negative");
        this.searchWaitSeconds = searchWaitSeconds;
    }

    public void match(UUID requestId) {
        RequestPoint request = loadRequest(requestId);
        if (!"searching".equals(request.status())) return;

        List<Candidate> candidates = eligibleCandidates(request);
        if (candidates.isEmpty()) {
            finishSearchIfTimedOut(request, false);
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
        for (List<Ranked> band : rankEtaBands(ranked, request.policy())) {
            for (int index = 0; index < band.size(); index++) {
                // Exclude candidates that already failed reservation and bands that never competed.
                if (tryOffer(request, band.subList(index, band.size())) != OfferResult.PROVIDER_UNAVAILABLE) return;
            }
        }
        finishSearchIfTimedOut(request, ranked.isEmpty());
    }

    private OfferResult tryOffer(RequestPoint request, List<Ranked> competing) {
        try {
            return transactions.execute(status -> writeOffer(request, competing));
        } catch (DataAccessException ex) {
            String detail = ex.getMostSpecificCause().getMessage();
            if (detail == null || !detail.contains("OFFER_OUTSIDE_WORKING_HOURS")) throw ex;
            return OfferResult.PROVIDER_UNAVAILABLE;
        }
    }

    static List<List<Ranked>> rankEtaBands(List<Ranked> candidates, MatchingPolicy policy) {
        List<Ranked> byEta = candidates.stream()
                .sorted(Comparator.comparingInt(value -> value.route().durationSeconds())).toList();
        List<List<Ranked>> bands = new ArrayList<>();
        for (int start = 0; start < byEta.size();) {
            int bestEtaSeconds = Math.max(0, byEta.get(start).route().durationSeconds());
            long endEta = (long) bestEtaSeconds + policy.etaWindowSeconds();
            int end = start + 1;
            while (end < byEta.size() && byEta.get(end).route().durationSeconds() <= endEta) end++;
            bands.add(byEta.subList(start, end).stream().sorted(priorityOrder(bestEtaSeconds, policy)).toList());
            start = end;
        }
        return bands;
    }

    private static Comparator<Ranked> priorityOrder(int bestEtaSeconds, MatchingPolicy policy) {
        return Comparator
                .comparingInt((Ranked value) -> isStarved(value, policy) ? 0 : 1)
                .thenComparingInt(value -> isStarved(value, policy)
                        ? -value.candidate().consecutiveSkips()
                        : 0)
                .thenComparingDouble(value -> rankingCost(value, bestEtaSeconds, policy))
                .thenComparingInt(value -> value.route().durationSeconds())
                .thenComparingInt(value -> value.route().distanceMeters())
                .thenComparing(Comparator.comparingLong(
                        (Ranked value) -> value.candidate().waitingSeconds()).reversed())
                .thenComparing(value -> value.candidate().providerId());
    }

    static double rankingCost(Ranked candidate, int bestEtaSeconds, MatchingPolicy policy) {
        double etaCost = Math.min(
                (double) Math.max(0, candidate.route().durationSeconds() - bestEtaSeconds)
                        / policy.etaWindowSeconds(),
                1);
        double waitingCost = 1 - Math.min(
                (double) Math.max(0, candidate.candidate().waitingSeconds())
                        / policy.waitingReferenceSeconds(),
                1);
        double recentCasesCost = Math.min(
                (double) Math.max(0, candidate.candidate().recentAcceptedCount())
                        / policy.recentReferenceCases(),
                1);
        return policy.etaWeight() * etaCost
                + policy.waitingWeight() * waitingCost
                + policy.recentCasesWeight() * recentCasesCost;
    }

    private static boolean isStarved(Ranked candidate, MatchingPolicy policy) {
        return candidate.candidate().consecutiveSkips() >= policy.starvationSkipThreshold();
    }

    public void retry(UUID requestId) {
        int changed = jdbc.update("""
                UPDATE public.rescue_requests rr
                SET status = 'searching', routing_status = 'pending'
                FROM public.service_types service
                WHERE rr.id = ? AND rr.status = 'no_provider'
                  AND service.code = rr.service_code AND service.is_active
                  AND rr.vehicle_power_type = 'gasoline' AND rr.service_code <> 'electric_battery'
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
                        SET status = 'resolved', resolved_at = NOW(), resolution_note = 'Quản trị viên vận hành đã tìm đội thay thế.'
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
        // Separate statement/transaction: do not retain provider locks before
        // acquiring request locks. Logical eligibility already expires exactly
        // at availability_until, even when this background worker is stopped.
        jdbc.update("""
                WITH expired AS (
                  SELECT pm.user_id FROM public.provider_members pm
                  WHERE pm.is_available
                    AND public.api_provider_receiving_until(pm.user_id, statement_timestamp()) IS NULL
                  ORDER BY pm.user_id FOR UPDATE OF pm SKIP LOCKED LIMIT 500
                )
                UPDATE public.provider_members pm SET is_available = FALSE
                FROM expired WHERE expired.user_id = pm.user_id
                """);
        List<UUID> requestsToRematch = transactions.execute(status -> {
            // Same lock order as offer acceptance: request -> offers -> provider.
            List<UUID> requests = jdbc.query("""
                    SELECT rr.id FROM public.rescue_requests rr WHERE rr.status = 'offered'
                      AND (EXISTS (
                        SELECT 1 FROM public.dispatch_offers offer
                        WHERE offer.request_id = rr.id AND offer.status = 'pending'
                          AND NOT public.api_offer_is_receivable(offer.id, statement_timestamp())
                      ) OR NOT EXISTS (
                        SELECT 1 FROM public.dispatch_offers offer
                        WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at > NOW()
                      ))
                    ORDER BY rr.id FOR UPDATE OF rr SKIP LOCKED LIMIT 100
                    """, (rs, rowNum) -> rs.getObject(1, UUID.class));
            List<UUID> rematch = new ArrayList<>();
            for (UUID requestId : requests) {
                jdbc.update("""
                        UPDATE public.dispatch_offers offer
                        SET status = CASE WHEN offer.expires_at <= statement_timestamp() THEN 'expired' ELSE 'withdrawn' END,
                            responded_at = statement_timestamp()
                        WHERE request_id = ? AND status = 'pending'
                          AND NOT public.api_offer_is_receivable(offer.id, statement_timestamp())
                        """, requestId);
                int changed = jdbc.update("""
                        UPDATE public.rescue_requests rr
                        SET status = 'searching', routing_status = 'pending'
                        WHERE rr.id = ? AND rr.status = 'offered' AND NOT EXISTS (
                          SELECT 1 FROM public.dispatch_offers offer
                          WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at > NOW())
                        """, requestId);
                if (changed > 0) rematch.add(requestId);
            }
            return rematch;
        });
        if (requestsToRematch != null) requestsToRematch.forEach(this::match);
    }

    private RequestPoint loadRequest(UUID requestId) {
        return Optional.ofNullable(jdbc.query("""
                        SELECT rr.id, rr.status, rr.version, rr.service_code,
                               rr.pickup_latitude, rr.pickup_longitude,
                               service.matching_eta_window_seconds,
                               service.matching_eta_weight,
                               service.matching_waiting_weight,
                               service.matching_recent_cases_weight,
                               service.matching_waiting_reference_seconds,
                               service.matching_recent_window_days,
                               service.matching_recent_reference_cases,
                               service.matching_starvation_skip_threshold,
                               service.matching_offer_ttl_seconds
                        FROM public.rescue_requests rr
                        JOIN public.service_types service ON service.code = rr.service_code
                        WHERE rr.id = ?
                        """, rs -> rs.next() ? new RequestPoint(
                        rs.getObject("id", UUID.class), rs.getString("status"), rs.getInt("version"), rs.getString("service_code"),
                        rs.getDouble("pickup_latitude"), rs.getDouble("pickup_longitude"),
                        new MatchingPolicy(
                                rs.getInt("matching_eta_window_seconds"),
                                rs.getDouble("matching_eta_weight"),
                                rs.getDouble("matching_waiting_weight"),
                                rs.getDouble("matching_recent_cases_weight"),
                                rs.getInt("matching_waiting_reference_seconds"),
                                rs.getInt("matching_recent_window_days"),
                                rs.getInt("matching_recent_reference_cases"),
                                rs.getInt("matching_starvation_skip_threshold"),
                                rs.getInt("matching_offer_ttl_seconds"))) : null, requestId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu cứu hộ."));
    }

    private List<Candidate> eligibleCandidates(RequestPoint request) {
        return jdbc.query("""
                SELECT pm.user_id, pm.team_id,
                       CASE WHEN pm.departure_expires_at IS NULL THEN team.base_latitude ELSE pm.last_latitude END AS origin_latitude,
                       CASE WHEN pm.departure_expires_at IS NULL THEN team.base_longitude ELSE pm.last_longitude END AS origin_longitude,
                       (
                         SELECT COUNT(*)::INTEGER
                         FROM public.dispatch_offers accepted_offer
                         JOIN public.rescue_requests accepted_request
                           ON accepted_request.id = accepted_offer.request_id
                         WHERE accepted_offer.provider_id = pm.user_id
                           AND accepted_offer.status = 'accepted'
                           AND accepted_request.service_code = ?
                           AND accepted_offer.responded_at >= NOW() - (? * INTERVAL '1 day')
                       ) AS recent_accepted_count,
                       GREATEST(EXTRACT(EPOCH FROM (
                         NOW() - GREATEST(
                           COALESCE(stats.last_offered_at, pm.created_at),
                           COALESCE(pm.available_since, pm.created_at)
                         )
                       )), 0)::BIGINT AS waiting_seconds,
                       COALESCE(stats.consecutive_skips, 0) AS consecutive_skips
                FROM public.provider_members pm
                JOIN public.rescue_teams team ON team.id = pm.team_id
                JOIN public.profiles profile ON profile.id = pm.user_id
                  AND profile.role = 'provider' AND profile.is_active
                JOIN public.team_capabilities capability
                  ON capability.team_id = pm.team_id AND capability.service_code = ? AND capability.is_active
                JOIN public.rescue_requests rr ON rr.id = ?
                LEFT JOIN public.provider_dispatch_stats stats
                  ON stats.provider_id = pm.user_id AND stats.service_code = ?
                WHERE pm.status = 'active'
                  AND NOT public.api_customer_provider_cooldown(rr.customer_id, pm.user_id, statement_timestamp())
                  AND rr.vehicle_power_type = 'gasoline' AND rr.service_code <> 'electric_battery'
                  AND pm.is_available
                  AND public.api_provider_receiving_until(pm.user_id, statement_timestamp()) IS NOT NULL
                  AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
                  AND public.api_is_in_service_area(rr.pickup_latitude, rr.pickup_longitude)
                  AND team.status = 'verified'
                  AND extensions.ST_DWithin(
                    extensions.ST_SetSRID(extensions.ST_MakePoint(team.base_longitude, team.base_latitude), 4326)::extensions.geography,
                    rr.pickup_location, team.service_radius_km * 1000)
                  AND NOT EXISTS (
                    SELECT 1 FROM public.rescue_requests active_request
                    WHERE active_request.assigned_provider_id = pm.user_id
                      AND active_request.status NOT IN ('completed', 'cancelled')
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM public.dispatch_offers previous_offer
                    WHERE previous_offer.request_id = rr.id
                      AND previous_offer.provider_id = pm.user_id
                      AND previous_offer.status IN ('declined', 'expired')
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM public.dispatch_offers active_offer
                    WHERE active_offer.provider_id = pm.user_id
                      AND active_offer.request_id <> rr.id
                      AND active_offer.status = 'pending'
                      AND active_offer.expires_at > NOW()
                  )
                ORDER BY pm.user_id
                """, (rs, rowNum) -> new Candidate(
                        rs.getObject("user_id", UUID.class),
                        rs.getObject("team_id", UUID.class),
                        rs.getDouble("origin_latitude"),
                        rs.getDouble("origin_longitude"),
                        rs.getInt("recent_accepted_count"),
                        rs.getLong("waiting_seconds"),
                        rs.getInt("consecutive_skips")),
                request.serviceCode(), request.policy().recentWindowDays(),
                request.serviceCode(), request.id(), request.serviceCode());
    }

    private OfferResult writeOffer(RequestPoint request, List<Ranked> rankedCandidates) {
        Ranked selected = rankedCandidates.getFirst();
        UUID requestId = request.id();
        String current = jdbc.query("""
                SELECT status FROM public.rescue_requests WHERE id = ? AND version = ?
                  AND vehicle_power_type = 'gasoline' AND service_code <> 'electric_battery'
                FOR UPDATE
                """,
                rs -> rs.next() ? rs.getString(1) : null, requestId, request.version());
        if (!"searching".equals(current)) return OfferResult.REQUEST_CHANGED;

        List<Double> originAccuracies = jdbc.query("""
                SELECT CASE WHEN pm.departure_expires_at IS NOT NULL THEN pm.location_accuracy_m END AS accuracy
                FROM public.provider_members pm
                JOIN public.rescue_teams team ON team.id = pm.team_id
                JOIN public.profiles profile ON profile.id = pm.user_id
                JOIN public.rescue_requests rr ON rr.id = ?
                WHERE pm.user_id = ? AND pm.team_id = ? AND pm.status = 'active' AND pm.is_available
                  AND public.api_provider_receiving_until(pm.user_id, statement_timestamp()) IS NOT NULL
                  AND profile.role = 'provider' AND profile.is_active AND team.status = 'verified'
                  AND CASE WHEN pm.departure_expires_at IS NULL THEN team.base_latitude ELSE pm.last_latitude END = ?
                  AND CASE WHEN pm.departure_expires_at IS NULL THEN team.base_longitude ELSE pm.last_longitude END = ?
                  AND NOT public.api_customer_provider_cooldown(rr.customer_id, pm.user_id, statement_timestamp())
                  AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
                  AND extensions.ST_DWithin(
                    extensions.ST_SetSRID(extensions.ST_MakePoint(team.base_longitude, team.base_latitude), 4326)::extensions.geography,
                    rr.pickup_location, team.service_radius_km * 1000)
                  AND EXISTS (SELECT 1 FROM public.team_capabilities cap
                    WHERE cap.team_id = pm.team_id AND cap.service_code = ? AND cap.is_active)
                  AND NOT EXISTS (SELECT 1 FROM public.rescue_requests active_request
                    WHERE active_request.assigned_provider_id = pm.user_id
                      AND active_request.status NOT IN ('completed', 'cancelled'))
                FOR UPDATE OF pm
                """, (rs, row) -> rs.getObject("accuracy") == null ? null : rs.getDouble("accuracy"),
                request.id(), selected.candidate().providerId(), selected.candidate().teamId(),
                selected.candidate().latitude(), selected.candidate().longitude(), request.serviceCode());
        if (originAccuracies.isEmpty()) return OfferResult.PROVIDER_UNAVAILABLE;

        // A separate statement AFTER obtaining the provider lock is intentional:
        // under READ COMMITTED it sees offers committed while the lock was awaited.
        // The pre-OSRM candidate snapshot (or a subquery inside the locking SELECT)
        // cannot reserve a provider across simultaneous customer requests.
        Boolean hasPendingOffer = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM public.dispatch_offers
                  WHERE provider_id = ? AND request_id <> ?
                    AND status = 'pending' AND expires_at > clock_timestamp())
                """, Boolean.class, selected.candidate().providerId(), requestId);
        if (!Boolean.FALSE.equals(hasPendingOffer)) return OfferResult.PROVIDER_UNAVAILABLE;

        jdbc.update("""
                UPDATE public.dispatch_offers SET status = 'withdrawn'
                WHERE request_id = ? AND status = 'pending'
                """, requestId);

        // Concurrent requests may rank the same providers in different orders.
        // Take shared fairness-stat row locks in a stable order to avoid deadlocks.
        for (Ranked candidate : rankedCandidates.stream()
                .sorted(Comparator.comparing(value -> value.candidate().providerId())).toList()) {
            boolean receivesOffer = candidate.candidate().providerId().equals(selected.candidate().providerId());
            jdbc.update("""
                    INSERT INTO public.provider_dispatch_stats(
                      provider_id, service_code, consecutive_skips, last_offered_at
                    ) SELECT ?, ?, ?, CASE WHEN ? THEN NOW() ELSE NULL END
                    WHERE public.api_provider_receiving_until(?, statement_timestamp()) IS NOT NULL
                    ON CONFLICT (provider_id, service_code) DO UPDATE SET
                      consecutive_skips = CASE WHEN ? THEN 0 ELSE LEAST(
                        public.provider_dispatch_stats.consecutive_skips + 1, 1000000) END,
                      last_offered_at = CASE WHEN ? THEN NOW()
                        ELSE public.provider_dispatch_stats.last_offered_at END,
                      updated_at = NOW()
                    """, candidate.candidate().providerId(), request.serviceCode(), receivesOffer ? 0 : 1,
                    receivesOffer, candidate.candidate().providerId(), receivesOffer, receivesOffer);
        }

        Instant expiresAt = Instant.now().plusSeconds(request.policy().offerTtlSeconds());
        jdbc.update("""
                INSERT INTO public.dispatch_offers(
                  request_id, provider_id, team_id, road_distance_m, eta_seconds, expires_at,
                  origin_latitude, origin_longitude, origin_accuracy_m
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (request_id, provider_id) DO UPDATE SET
                  team_id = EXCLUDED.team_id,
                  status = 'pending',
                  road_distance_m = EXCLUDED.road_distance_m,
                  eta_seconds = EXCLUDED.eta_seconds,
                  origin_latitude = EXCLUDED.origin_latitude,
                  origin_longitude = EXCLUDED.origin_longitude,
                  origin_accuracy_m = EXCLUDED.origin_accuracy_m,
                  offered_at = NOW(),
                  expires_at = EXCLUDED.expires_at,
                  responded_at = NULL
                """, requestId, selected.candidate().providerId(), selected.candidate().teamId(),
                selected.route().distanceMeters(), selected.route().durationSeconds(), Timestamp.from(expiresAt),
                selected.candidate().latitude(), selected.candidate().longitude(), originAccuracies.getFirst());
        jdbc.update("""
                UPDATE public.rescue_requests SET status = 'offered', routing_status = 'road'
                WHERE id = ? AND status = 'searching'
                """, requestId);
        push.notifyUser(selected.candidate().providerId(), NotificationKind.NEW_OFFER, null, requestId);
        return OfferResult.SENT;
    }

    private void finishSearchIfTimedOut(RequestPoint request, boolean routingUnavailable) {
        // Each entry into searching has a durable status event. Polls, edits and worker
        // restarts must not extend the wait. A manual retry starts a new search on the same case.
        transactions.executeWithoutResult(status -> {
            UUID customerId = jdbc.query("""
                    UPDATE public.rescue_requests rr
                    SET status = 'no_provider', routing_status = ?
                    WHERE rr.id = ? AND rr.status = 'searching' AND rr.version = ?
                      AND COALESCE((SELECT MAX(event.created_at) FROM public.request_status_events event
                                    WHERE event.request_id = rr.id AND event.to_status = 'searching'), rr.requested_at)
                          <= statement_timestamp() - (? * INTERVAL '1 second')
                    RETURNING customer_id
                    """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                    routingUnavailable ? "unavailable" : "pending", request.id(), request.version(), searchWaitSeconds);
            if (customerId != null) {
                push.notifyUser(customerId, NotificationKind.NO_PROVIDER, null, request.id());
            }
        });
    }
}

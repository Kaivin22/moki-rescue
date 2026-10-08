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
    private record RequestPoint(
            UUID id,
            String status,
            String serviceCode,
            double latitude,
            double longitude,
            MatchingPolicy policy) {}

    record Candidate(
            UUID providerId,
            UUID teamId,
            double latitude,
            double longitude,
            int completedServiceCount,
            int recentAcceptedCount,
            long waitingSeconds,
            int consecutiveSkips) {}

    record Ranked(Candidate candidate, RoadRoute route) {}

    record MatchingPolicy(
            int etaWindowSeconds,
            double etaWeight,
            double experienceWeight,
            double waitingWeight,
            double recentCasesWeight,
            int experienceReferenceCases,
            int waitingReferenceSeconds,
            int recentWindowDays,
            int recentReferenceCases,
            int starvationSkipThreshold,
            int offerTtlSeconds) {
        MatchingPolicy {
            etaWindowSeconds = Math.max(60, Math.min(etaWindowSeconds, 3_600));
            double safeEtaWeight = safeWeight(etaWeight);
            double safeExperienceWeight = safeWeight(experienceWeight);
            double safeWaitingWeight = safeWeight(waitingWeight);
            double safeRecentCasesWeight = safeWeight(recentCasesWeight);
            double totalWeight = safeEtaWeight + safeExperienceWeight + safeWaitingWeight + safeRecentCasesWeight;
            if (totalWeight == 0) {
                etaWeight = 1;
                experienceWeight = 0;
                waitingWeight = 0;
                recentCasesWeight = 0;
            } else {
                etaWeight = safeEtaWeight / totalWeight;
                experienceWeight = safeExperienceWeight / totalWeight;
                waitingWeight = safeWaitingWeight / totalWeight;
                recentCasesWeight = safeRecentCasesWeight / totalWeight;
            }
            experienceReferenceCases = Math.max(1, Math.min(experienceReferenceCases, 10_000));
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
        List<Ranked> ordered = rankCandidates(ranked, request.policy());

        if (ordered.isEmpty()) {
            markNoProvider(requestId, true);
            return;
        }
        Ranked selected = ordered.get(0);
        Boolean offered = transactions.execute(status -> {
            if (!writeOffer(request, ordered, selected)) return false;
            push.notifyUser(selected.candidate().providerId(), NotificationKind.NEW_OFFER, null, requestId);
            return true;
        });
        // Eligibility/shop coordinates can change while OSRM is responding.
        // Stop explicitly instead of publishing an ETA for an outdated origin.
        if (!Boolean.TRUE.equals(offered)) markNoProvider(requestId, false);
    }

    static List<Ranked> rankCandidates(List<Ranked> candidates, MatchingPolicy policy) {
        int bestEtaSeconds = candidates.stream()
                .mapToInt(value -> Math.max(0, value.route().durationSeconds()))
                .min()
                .orElse(Integer.MAX_VALUE);
        long latestAcceptedEta = (long) bestEtaSeconds + policy.etaWindowSeconds();

        return candidates.stream()
                .filter(value -> Math.max(0, value.route().durationSeconds()) <= latestAcceptedEta)
                .sorted(Comparator
                .comparingInt((Ranked value) -> isStarved(value, policy) ? 0 : 1)
                .thenComparingInt(value -> isStarved(value, policy)
                        ? -value.candidate().consecutiveSkips()
                        : 0)
                .thenComparingDouble(value -> rankingCost(value, bestEtaSeconds, policy))
                .thenComparingInt(value -> value.route().durationSeconds())
                .thenComparingInt(value -> value.route().distanceMeters())
                .thenComparing(Comparator.comparingLong(
                        (Ranked value) -> value.candidate().waitingSeconds()).reversed())
                .thenComparing(Comparator.comparingInt(
                        (Ranked value) -> value.candidate().completedServiceCount()).reversed())
                .thenComparing(value -> value.candidate().providerId()))
                .toList();
    }

    static double rankingCost(Ranked candidate, int bestEtaSeconds, MatchingPolicy policy) {
        double etaCost = Math.min(
                (double) Math.max(0, candidate.route().durationSeconds() - bestEtaSeconds)
                        / policy.etaWindowSeconds(),
                1);
        double experienceCost = 1 - Math.min(
                (double) Math.max(0, candidate.candidate().completedServiceCount())
                        / policy.experienceReferenceCases(),
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
                + policy.experienceWeight() * experienceCost
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
        List<UUID> requestsToRematch = transactions.execute(status -> {
            // Same lock order as offer acceptance: request -> offers -> provider.
            List<UUID> requests = jdbc.query("""
                    SELECT rr.id FROM public.rescue_requests rr WHERE rr.status = 'offered'
                      AND (EXISTS (
                        SELECT 1 FROM public.dispatch_offers offer
                        WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at <= NOW()
                      ) OR NOT EXISTS (
                        SELECT 1 FROM public.dispatch_offers offer
                        WHERE offer.request_id = rr.id AND offer.status = 'pending' AND offer.expires_at > NOW()
                      ))
                    ORDER BY rr.id FOR UPDATE OF rr SKIP LOCKED LIMIT 100
                    """, (rs, rowNum) -> rs.getObject(1, UUID.class));
            List<UUID> rematch = new ArrayList<>();
            for (UUID requestId : requests) {
                jdbc.update("""
                        UPDATE public.dispatch_offers SET status = 'expired', responded_at = NOW()
                        WHERE request_id = ? AND status = 'pending' AND expires_at <= NOW()
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
                        SELECT rr.id, rr.status, rr.service_code,
                               rr.pickup_latitude, rr.pickup_longitude,
                               service.matching_eta_window_seconds,
                               service.matching_eta_weight,
                               service.matching_experience_weight,
                               service.matching_waiting_weight,
                               service.matching_recent_cases_weight,
                               service.matching_experience_reference_cases,
                               service.matching_waiting_reference_seconds,
                               service.matching_recent_window_days,
                               service.matching_recent_reference_cases,
                               service.matching_starvation_skip_threshold,
                               service.matching_offer_ttl_seconds
                        FROM public.rescue_requests rr
                        JOIN public.service_types service ON service.code = rr.service_code
                        WHERE rr.id = ?
                        """, rs -> rs.next() ? new RequestPoint(
                        rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("service_code"),
                        rs.getDouble("pickup_latitude"), rs.getDouble("pickup_longitude"),
                        new MatchingPolicy(
                                rs.getInt("matching_eta_window_seconds"),
                                rs.getDouble("matching_eta_weight"),
                                rs.getDouble("matching_experience_weight"),
                                rs.getDouble("matching_waiting_weight"),
                                rs.getDouble("matching_recent_cases_weight"),
                                rs.getInt("matching_experience_reference_cases"),
                                rs.getInt("matching_waiting_reference_seconds"),
                                rs.getInt("matching_recent_window_days"),
                                rs.getInt("matching_recent_reference_cases"),
                                rs.getInt("matching_starvation_skip_threshold"),
                                rs.getInt("matching_offer_ttl_seconds"))) : null, requestId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu cứu hộ."));
    }

    private List<Candidate> eligibleCandidates(RequestPoint request) {
        return jdbc.query("""
                SELECT pm.user_id, pm.team_id, team.base_latitude, team.base_longitude,
                       (
                         SELECT COUNT(*)::INTEGER
                         FROM public.rescue_requests completed
                         WHERE completed.assigned_provider_id = pm.user_id
                           AND completed.service_code = ?
                           AND completed.status = 'completed'
                       ) AS completed_service_count,
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
                  AND pm.is_available
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
                        rs.getDouble("base_latitude"),
                        rs.getDouble("base_longitude"),
                        rs.getInt("completed_service_count"),
                        rs.getInt("recent_accepted_count"),
                        rs.getLong("waiting_seconds"),
                        rs.getInt("consecutive_skips")),
                request.serviceCode(), request.serviceCode(), request.policy().recentWindowDays(),
                request.serviceCode(), request.id(), request.serviceCode());
    }

    private boolean writeOffer(RequestPoint request, List<Ranked> rankedCandidates, Ranked selected) {
        UUID requestId = request.id();
        String current = jdbc.query("SELECT status FROM public.rescue_requests WHERE id = ? FOR UPDATE",
                rs -> rs.next() ? rs.getString(1) : null, requestId);
        if (!"searching".equals(current)) return false;

        List<UUID> stillEligible = jdbc.query("""
                SELECT pm.user_id FROM public.provider_members pm
                JOIN public.rescue_teams team ON team.id = pm.team_id
                JOIN public.profiles profile ON profile.id = pm.user_id
                WHERE pm.user_id = ? AND pm.team_id = ? AND pm.status = 'active' AND pm.is_available
                  AND profile.role = 'provider' AND profile.is_active AND team.status = 'verified'
                  AND team.base_latitude = ? AND team.base_longitude = ?
                  AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
                  AND EXISTS (SELECT 1 FROM public.team_capabilities cap
                    WHERE cap.team_id = pm.team_id AND cap.service_code = ? AND cap.is_active)
                  AND NOT EXISTS (SELECT 1 FROM public.rescue_requests active_request
                    WHERE active_request.assigned_provider_id = pm.user_id
                      AND active_request.status NOT IN ('completed', 'cancelled'))
                FOR UPDATE OF pm
                """, (rs, row) -> rs.getObject("user_id", UUID.class),
                selected.candidate().providerId(), selected.candidate().teamId(),
                selected.candidate().latitude(), selected.candidate().longitude(), request.serviceCode());
        if (stillEligible.isEmpty()) return false;

        jdbc.update("""
                UPDATE public.dispatch_offers SET status = 'withdrawn'
                WHERE request_id = ? AND status = 'pending'
                """, requestId);

        for (Ranked candidate : rankedCandidates) {
            boolean receivesOffer = candidate.candidate().providerId().equals(selected.candidate().providerId());
            jdbc.update("""
                    INSERT INTO public.provider_dispatch_stats(
                      provider_id, service_code, consecutive_skips, last_offered_at
                    ) VALUES (?, ?, ?, CASE WHEN ? THEN NOW() ELSE NULL END)
                    ON CONFLICT (provider_id, service_code) DO UPDATE SET
                      consecutive_skips = CASE WHEN ? THEN 0 ELSE LEAST(
                        public.provider_dispatch_stats.consecutive_skips + 1, 1000000) END,
                      last_offered_at = CASE WHEN ? THEN NOW()
                        ELSE public.provider_dispatch_stats.last_offered_at END,
                      updated_at = NOW()
                    """, candidate.candidate().providerId(), request.serviceCode(), receivesOffer ? 0 : 1,
                    receivesOffer, receivesOffer, receivesOffer);
        }

        Instant expiresAt = Instant.now().plusSeconds(request.policy().offerTtlSeconds());
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
                """, requestId, selected.candidate().providerId(), selected.candidate().teamId(),
                selected.route().distanceMeters(), selected.route().durationSeconds(), Timestamp.from(expiresAt));
        jdbc.update("""
                UPDATE public.rescue_requests SET status = 'offered', routing_status = 'road'
                WHERE id = ? AND status = 'searching'
                """, requestId);
        return true;
    }

    private void markNoProvider(UUID requestId, boolean routingUnavailable) {
        transactions.executeWithoutResult(status -> {
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
        });
    }
}

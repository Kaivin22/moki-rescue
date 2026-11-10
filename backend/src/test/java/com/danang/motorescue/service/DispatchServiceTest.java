package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.danang.motorescue.service.DispatchService.Candidate;
import com.danang.motorescue.service.DispatchService.MatchingPolicy;
import com.danang.motorescue.service.DispatchService.Ranked;
import com.danang.motorescue.service.RoadRoutingService.RoadRoute;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DispatchServiceTest {
    @Test
    void createsEtaBandBeforeFairnessCanInfluenceOrder() {
        Candidate nearest = candidate("00000000-0000-0000-0000-000000000001", 0, 0, 0);
        Candidate nearbyWaiting = candidate("00000000-0000-0000-0000-000000000002", 0, 7200, 0);
        Candidate farWaiting = candidate("00000000-0000-0000-0000-000000000003", 0, 7200, 0);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(nearest, route(1_000, 300)),
                new Ranked(nearbyWaiting, route(1_500, 360)),
                new Ranked(farWaiting, route(3_000, 900))), policy(120, 0.4, 0.6, 0, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(nearbyWaiting.providerId(), nearest.providerId());
        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .doesNotContain(farWaiting.providerId());
    }

    @Test
    void balancesWaitingTimeAndRecentAssignmentsUsingConfiguredWeights() {
        Candidate frequentlyOffered = candidate("00000000-0000-0000-0000-000000000001", 8, 60, 0);
        Candidate waitingLonger = candidate("00000000-0000-0000-0000-000000000002", 0, 7_200, 0);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(frequentlyOffered, route(1_000, 300)),
                new Ranked(waitingLonger, route(1_100, 330))), policy(300, 0.2, 0.4, 0.4, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(waitingLonger.providerId(), frequentlyOffered.providerId());
    }

    @Test
    void starvationRuleOverridesScoreOnlyInsideEtaBand() {
        Candidate normal = candidate("00000000-0000-0000-0000-000000000001", 0, 7_200, 0);
        Candidate starvedNearby = candidate("00000000-0000-0000-0000-000000000002", 10, 0, 3);
        Candidate starvedFarAway = candidate("00000000-0000-0000-0000-000000000003", 0, 0, 99);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(normal, route(1_000, 300)),
                new Ranked(starvedNearby, route(1_500, 420)),
                new Ranked(starvedFarAway, route(3_000, 900))), policy(180, 1, 0, 0, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(starvedNearby.providerId(), normal.providerId());
        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .doesNotContain(starvedFarAway.providerId());
    }

    @Test
    void normalizesOnlyTheThreeRemainingWeights() {
        MatchingPolicy policy = policy(300, .55, .15, .15, 3);
        Ranked waiting = new Ranked(candidate("00000000-0000-0000-0000-000000000001", 5, 3600, 0), route(1000, 180));
        assertThat(DispatchService.rankingCost(waiting, 120, policy))
                .isCloseTo((.55 * .2 + .15 * .5 + .15 * .5) / .85,
                        org.assertj.core.data.Offset.offset(1e-12));
        assertThat(policy(300, 0, 0, 0, 3).etaWeight()).isEqualTo(1);
        assertThat(DispatchService.rankingCost(waiting, 120, policy(300, 0, 0, 0, 3))).isEqualTo(.2);
    }

    @Test
    void identicalMetricsUseStableIdRegardlessOfInputOrder() {
        Candidate first = candidate("00000000-0000-0000-0000-000000000001", 0, 100, 0);
        Candidate second = candidate("00000000-0000-0000-0000-000000000002", 0, 100, 0);
        assertThat(DispatchService.rankCandidates(List.of(new Ranked(second, route(1000, 300)),
                new Ranked(first, route(1000, 300))), policy(300, .55, .15, .15, 3)))
                .extracting(r -> r.candidate().providerId()).containsExactly(first.providerId(), second.providerId());
    }

    private static Candidate candidate(
            String providerId,
            int recentAcceptedCount,
            long waitingSeconds,
            int consecutiveSkips) {
        UUID id = UUID.fromString(providerId);
        return new Candidate(
                id, UUID.randomUUID(), 16.0, 108.0,
                recentAcceptedCount, waitingSeconds, consecutiveSkips);
    }

    private static RoadRoute route(int distanceMeters, int durationSeconds) {
        return new RoadRoute(distanceMeters, durationSeconds, List.of());
    }

    private static MatchingPolicy policy(
            int etaWindowSeconds,
            double etaWeight,
            double waitingWeight,
            double recentCasesWeight,
            int starvationThreshold) {
        return new MatchingPolicy(
                etaWindowSeconds,
                etaWeight,
                waitingWeight,
                recentCasesWeight,
                7_200,
                7,
                10,
                starvationThreshold,
                45);
    }
}

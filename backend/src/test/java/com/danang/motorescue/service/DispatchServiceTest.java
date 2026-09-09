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
    void createsEtaBandBeforeExperienceCanInfluenceOrder() {
        Candidate nearestNewcomer = candidate("00000000-0000-0000-0000-000000000001", 0, 0, 0, 0);
        Candidate nearbyExperienced = candidate("00000000-0000-0000-0000-000000000002", 50, 0, 0, 0);
        Candidate farExperienced = candidate("00000000-0000-0000-0000-000000000003", 50, 0, 0, 0);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(nearestNewcomer, route(1_000, 300)),
                new Ranked(nearbyExperienced, route(1_500, 360)),
                new Ranked(farExperienced, route(3_000, 900))), policy(120, 0.4, 0.6, 0, 0, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(nearbyExperienced.providerId(), nearestNewcomer.providerId());
        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .doesNotContain(farExperienced.providerId());
    }

    @Test
    void balancesWaitingTimeAndRecentAssignmentsUsingConfiguredWeights() {
        Candidate frequentlyOffered = candidate("00000000-0000-0000-0000-000000000001", 20, 8, 60, 0);
        Candidate waitingLonger = candidate("00000000-0000-0000-0000-000000000002", 5, 0, 7_200, 0);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(frequentlyOffered, route(1_000, 300)),
                new Ranked(waitingLonger, route(1_100, 330))), policy(300, 0.2, 0, 0.4, 0.4, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(waitingLonger.providerId(), frequentlyOffered.providerId());
    }

    @Test
    void starvationRuleOverridesScoreOnlyInsideEtaBand() {
        Candidate normal = candidate("00000000-0000-0000-0000-000000000001", 50, 0, 7_200, 0);
        Candidate starvedNearby = candidate("00000000-0000-0000-0000-000000000002", 0, 10, 0, 3);
        Candidate starvedFarAway = candidate("00000000-0000-0000-0000-000000000003", 0, 0, 0, 99);

        List<Ranked> ranked = DispatchService.rankCandidates(List.of(
                new Ranked(normal, route(1_000, 300)),
                new Ranked(starvedNearby, route(1_500, 420)),
                new Ranked(starvedFarAway, route(3_000, 900))), policy(180, 1, 0, 0, 0, 3));

        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .containsExactly(starvedNearby.providerId(), normal.providerId());
        assertThat(ranked).extracting(value -> value.candidate().providerId())
                .doesNotContain(starvedFarAway.providerId());
    }

    private static Candidate candidate(
            String providerId,
            int completedServiceCount,
            int recentAcceptedCount,
            long waitingSeconds,
            int consecutiveSkips) {
        UUID id = UUID.fromString(providerId);
        return new Candidate(
                id, UUID.randomUUID(), 16.0, 108.0,
                completedServiceCount, recentAcceptedCount, waitingSeconds, consecutiveSkips);
    }

    private static RoadRoute route(int distanceMeters, int durationSeconds) {
        return new RoadRoute(distanceMeters, durationSeconds, List.of());
    }

    private static MatchingPolicy policy(
            int etaWindowSeconds,
            double etaWeight,
            double experienceWeight,
            double waitingWeight,
            double recentCasesWeight,
            int starvationThreshold) {
        return new MatchingPolicy(
                etaWindowSeconds,
                etaWeight,
                experienceWeight,
                waitingWeight,
                recentCasesWeight,
                50,
                7_200,
                7,
                10,
                starvationThreshold,
                45);
    }
}

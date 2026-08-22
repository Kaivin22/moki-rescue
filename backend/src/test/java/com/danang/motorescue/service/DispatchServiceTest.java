package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.danang.motorescue.service.DispatchService.Candidate;
import com.danang.motorescue.service.DispatchService.Ranked;
import com.danang.motorescue.service.RoadRoutingService.RoadRoute;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DispatchServiceTest {
    @Test
    void ranksByRoadEtaThenDistanceAndStableProviderId() {
        Candidate slow = candidate("00000000-0000-0000-0000-000000000003");
        Candidate farther = candidate("00000000-0000-0000-0000-000000000002");
        Candidate nearer = candidate("00000000-0000-0000-0000-000000000001");

        List<Ranked> selected = DispatchService.selectFastest(List.of(
                new Ranked(slow, route(2_000, 900)),
                new Ranked(farther, route(1_500, 300)),
                new Ranked(nearer, route(1_000, 300))), 2);

        assertThat(selected).extracting(value -> value.candidate().providerId())
                .containsExactly(nearer.providerId(), farther.providerId());
    }

    private static Candidate candidate(String providerId) {
        UUID id = UUID.fromString(providerId);
        return new Candidate(id, UUID.randomUUID(), 16.0, 108.0);
    }

    private static RoadRoute route(int distanceMeters, int durationSeconds) {
        return new RoadRoute(distanceMeters, durationSeconds, List.of());
    }
}

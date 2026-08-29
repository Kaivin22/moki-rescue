package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.danang.motorescue.config.RoutingProperties;
import com.danang.motorescue.service.RoadRoutingService.RoadPoint;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RoadRoutingServiceTest {
    @Test
    void batchesTableRequestsAndPreservesOriginOrder() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RoadRoutingService service = new RoadRoutingService(
                builder.build(), new RoutingProperties("https://router.example", "driving", 500, 2));

        server.expect(requestTo(containsString("sources=0;1&destinations=2")))
                .andRespond(withSuccess(
                        "{\"code\":\"Ok\",\"durations\":[[30],[20]],\"distances\":[[3000],[2000]]}",
                        MediaType.APPLICATION_JSON));
        server.expect(requestTo(containsString("sources=0&destinations=1")))
                .andRespond(withSuccess(
                        "{\"code\":\"Ok\",\"durations\":[[10]],\"distances\":[[1000]]}",
                        MediaType.APPLICATION_JSON));

        List<Optional<RoadRoutingService.RoadRoute>> routes = service.routesToDestination(
                List.of(new RoadPoint(16.01, 108.01), new RoadPoint(16.02, 108.02),
                        new RoadPoint(16.03, 108.03)),
                new RoadPoint(16.04, 108.04));

        assertThat(routes).hasSize(3);
        assertThat(routes).extracting(route -> route.orElseThrow().durationSeconds())
                .containsExactly(30, 20, 10);
        server.verify();
    }

    @Test
    void keepsNoRouteAsEmptyInsteadOfInventingStraightLineMetrics() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RoadRoutingService service = new RoadRoutingService(
                builder.build(), new RoutingProperties("https://router.example", "driving", 500, 80));
        server.expect(requestTo(containsString("annotations=duration,distance")))
                .andRespond(withSuccess(
                        "{\"code\":\"Ok\",\"durations\":[[null]],\"distances\":[[null]]}",
                        MediaType.APPLICATION_JSON));

        assertThat(service.routesToDestination(
                List.of(new RoadPoint(16.01, 108.01)), new RoadPoint(16.02, 108.02)))
                .containsExactly(Optional.empty());
        server.verify();
    }

    @Test
    void rejectsInvalidRoadGeometryInsteadOfPassingItToTheMap() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RoadRoutingService service = new RoadRoutingService(
                builder.build(), new RoutingProperties("https://router.example", "driving", 500, 80));
        server.expect(requestTo(containsString("overview=full")))
                .andRespond(withSuccess(
                        "{\"code\":\"Ok\",\"routes\":[{\"distance\":1200,\"duration\":300,"
                                + "\"geometry\":{\"coordinates\":[[108.1,16.1],[999,16.2]]}}]}",
                        MediaType.APPLICATION_JSON));

        assertThat(service.routeWithGeometry(16.01, 108.01, 16.02, 108.02)).isEmpty();
        server.verify();
    }
}

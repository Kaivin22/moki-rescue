package com.danang.itinerary.service;

import com.danang.itinerary.config.RoutingProperties;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RouteOptimizerServiceTest {
    private final RouteOptimizerService service = new RouteOptimizerService(
            mock(RestClient.class),
            new RoutingProperties("", "", "", "", 750));

    @Test
    void returnsEveryPlaceExactlyOnceAndBalancesDaysWhenRoutingIsUnavailable() {
        var request = new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20),
            new RouteOptimizerService.PlacePoint("b", 16.06, 108.25),
            new RouteOptimizerService.PlacePoint("c", 16.10, 108.18),
            new RouteOptimizerService.PlacePoint("d", 16.12, 108.22)
        ), 2, "motorbike");

        var result = service.optimize(request);

        assertThat(result.days()).hasSize(2);
        assertThat(result.days().stream().flatMap(List::stream)).containsExactlyInAnyOrder("a", "b", "c", "d");
        assertThat(result.days()).allSatisfy(day -> assertThat(day).hasSize(2));
        assertThat(result.roadDataUsed()).isFalse();
        assertThat(result.routingStatus()).isEqualTo("estimated");
        assertThat(result.objective()).isEqualTo("estimated_travel_time");
        assertThat(result.totalDistanceKm()).isPositive();
    }

    @Test
    void rejectsUnsupportedTransport() {
        var request = new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20)
        ), 1, "plane");

        assertThatThrownBy(() -> service.optimize(request))
            .hasMessageContaining("Phương tiện");
    }

    @Test
    void rejectsMoreDaysThanTheMobileAndDatabaseContract() {
        var request = new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20)
        ), 11, "walk");

        assertThatThrownBy(() -> service.optimize(request))
            .isInstanceOf(com.danang.itinerary.web.ApiException.class)
            .hasMessageContaining("1 đến 10");
    }

    @Test
    void reportsNoRoadDataForASinglePlace() {
        var result = service.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20)
        ), 1, "car"));

        assertThat(result.roadDataUsed()).isFalse();
        assertThat(result.routingStatus()).isEqualTo("not_needed");
        assertThat(result.objective()).isEqualTo("estimated_travel_time");
        assertThat(result.totalDistanceKm()).isZero();
    }

    @Test
    void keepsContiguousRouteSegmentsTogetherWhenSplittingAcrossDays() {
        var result = service.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.00),
            new RouteOptimizerService.PlacePoint("b", 16.05, 108.05),
            new RouteOptimizerService.PlacePoint("c", 16.05, 108.10),
            new RouteOptimizerService.PlacePoint("d", 16.05, 108.15)
        ), 2, "car"));

        assertThat(result.days()).hasSize(2);
        assertThat(result.days()).anySatisfy(day -> assertThat(day).containsExactlyInAnyOrder("a", "b"));
        assertThat(result.days()).anySatisfy(day -> assertThat(day).containsExactlyInAnyOrder("c", "d"));
        assertThat(result.exactOrder()).isFalse();
    }

    @Test
    void balancesVisitDurationInsteadOfOnlyPlaceCount() {
        var result = service.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("long", 16.05, 108.00, 600),
            new RouteOptimizerService.PlacePoint("short-a", 16.05, 108.01, 60),
            new RouteOptimizerService.PlacePoint("short-b", 16.05, 108.02, 60),
            new RouteOptimizerService.PlacePoint("short-c", 16.05, 108.03, 60)
        ), 2, "car"));

        assertThat(result.days()).hasSize(2);
        assertThat(result.days()).anySatisfy(day -> assertThat(day).containsExactly("long"));
        assertThat(result.days()).anySatisfy(day -> assertThat(day).containsExactlyInAnyOrder("short-a", "short-b", "short-c"));
    }

    @Test
    void rejectsMissingRequestAndInvalidDuration() {
        assertThatThrownBy(() -> service.optimize(null))
            .isInstanceOf(com.danang.itinerary.web.ApiException.class);
        assertThatThrownBy(() -> service.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20, 0)
        ), 1, "car"))).hasMessageContaining("thời lượng");
    }

    @Test
    void marksSmallSingleDayOptimizationAsExactForTheAvailableMatrix() {
        var result = service.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.00),
            new RouteOptimizerService.PlacePoint("b", 16.06, 108.03),
            new RouteOptimizerService.PlacePoint("c", 16.04, 108.07)
        ), 1, "bicycle"));

        assertThat(result.exactOrder()).isTrue();
        assertThat(result.routingStatus()).isEqualTo("estimated");
    }

    @Test
    void usesTheSelectedTransportInstanceAndReportsRoadData() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer routingServer = MockRestServiceServer.bindTo(builder).build();
        routingServer.expect(request -> {
            assertThat(request.getURI().toString())
                .startsWith("https://motorbike-routing.test/table/v1/driving/")
                .contains("radiuses=750;750");
        }).andRespond(withSuccess("""
            {
              "code": "Ok",
              "durations": [[0, 600], [660, 0]],
              "distances": [[0, 5000], [5200, 0]]
            }
            """, MediaType.APPLICATION_JSON));
        var roadService = new RouteOptimizerService(
            builder.build(),
            new RoutingProperties(
                "https://car-routing.test",
                "https://motorbike-routing.test",
                "https://walk-routing.test",
                "https://bicycle-routing.test",
                750));

        var result = roadService.optimize(new RouteOptimizerService.OptimizeRequest(List.of(
            new RouteOptimizerService.PlacePoint("a", 16.05, 108.20),
            new RouteOptimizerService.PlacePoint("b", 16.06, 108.25)
        ), 1, "motorbike"));

        routingServer.verify();
        assertThat(result.days()).containsExactly(List.of("a", "b"));
        assertThat(result.roadDataUsed()).isTrue();
        assertThat(result.routingStatus()).isEqualTo("road");
        assertThat(result.objective()).isEqualTo("fastest_route_time");
        assertThat(result.totalDistanceKm()).isEqualTo(5.0);
        assertThat(result.totalTravelTimeMin()).isEqualTo(10);
    }
}

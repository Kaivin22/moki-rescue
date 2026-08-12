package com.danang.itinerary.service;

import com.danang.itinerary.config.RoutingProperties;
import com.danang.itinerary.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteOptimizerService {
    // 8! = 40,320 đường đi; 12! = 479 triệu và có thể làm nghẽn worker production.
    private static final int EXACT_PATH_LIMIT = 8;
    private static final int TRANSITION_BUFFER_MIN = 10;

    private final RestClient routingRestClient;
    private final RoutingProperties routingProperties;

    public record PlacePoint(String id, double lat, double lng, int durationMin) {
        public PlacePoint(String id, double lat, double lng) {
            this(id, lat, lng, 60);
        }
    }
    public record OptimizeRequest(List<PlacePoint> places, int numDays, String transport) {}
    public record OptimizeResponse(
            List<List<String>> days,
            double totalDistanceKm,
            int totalTravelTimeMin,
            boolean roadDataUsed,
            String routingStatus,
            String objective,
            boolean exactOrder) {}
    private record Matrix(double[][] seconds, double[][] meters, boolean roadData) {}

    public OptimizeResponse optimize(OptimizeRequest request) {
        if (request == null || request.places() == null || request.places().isEmpty() || request.places().size() > 40) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PLACES", "Số địa điểm phải từ 1 đến 40.");
        }
        if (request.numDays() < 1 || request.numDays() > 10) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DAYS", "Số ngày phải từ 1 đến 10.");
        }
        String transport = normalizeTransport(request.transport());
        request.places().forEach(this::validatePoint);
        if (request.places().stream().map(PlacePoint::id).distinct().count() != request.places().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DUPLICATE_PLACE", "Danh sách địa điểm có id trùng nhau.");
        }

        Matrix globalMatrix = matrix(request.places(), transport);
        int populatedDayCount = Math.min(request.numDays(), request.places().size());
        List<Integer> globalOrder = optimalOrder(globalMatrix.seconds());
        List<List<Integer>> dayIndexes = splitBalanced(globalOrder, populatedDayCount, globalMatrix, request.places());

        List<List<String>> days = new ArrayList<>();
        double totalMeters = 0;
        double totalSeconds = 0;
        for (List<Integer> indexes : dayIndexes) {
            Matrix dayMatrix = subMatrix(globalMatrix, indexes);
            List<Integer> localOrder = optimalOrder(dayMatrix.seconds());
            List<Integer> orderedGlobalIndexes = localOrder.stream().map(indexes::get).toList();
            days.add(orderedGlobalIndexes.stream().map(index -> request.places().get(index).id()).toList());
            for (int i = 0; i + 1 < localOrder.size(); i++) {
                totalSeconds += dayMatrix.seconds()[localOrder.get(i)][localOrder.get(i + 1)];
                totalMeters += dayMatrix.meters()[localOrder.get(i)][localOrder.get(i + 1)];
            }
        }
        while (days.size() < request.numDays()) days.add(List.of());

        boolean needsRoute = request.places().size() >= 2;
        boolean roadDataUsed = needsRoute && globalMatrix.roadData();
        String routingStatus = !needsRoute ? "not_needed" : roadDataUsed ? "road" : "estimated";
        boolean exactOrder = request.numDays() == 1 && request.places().size() <= EXACT_PATH_LIMIT;
        return new OptimizeResponse(
                days,
                Math.round(totalMeters / 100.0) / 10.0,
                (int) Math.ceil(totalSeconds / 60.0),
                roadDataUsed,
                routingStatus,
                roadDataUsed ? "fastest_route_time" : "estimated_travel_time",
                exactOrder);
    }

    private Matrix matrix(List<PlacePoint> places, String transport) {
        if (places.size() == 1) return new Matrix(new double[][]{{0}}, new double[][]{{0}}, false);
        String baseUrl = routingProperties.baseUrlFor(transport);
        if (baseUrl != null) {
            String coordinates = String.join(";", places.stream().map(p -> p.lng() + "," + p.lat()).toList());
            String radiuses = String.join(";", Collections.nCopies(places.size(), String.valueOf(routingProperties.maxSnapRadiusMeters())));
            try {
                URI uri = URI.create(baseUrl + "/table/v1/driving/" + coordinates
                        + "?annotations=duration,distance&radiuses=" + radiuses);
                JsonNode json = routingRestClient.get().uri(uri).retrieve().body(JsonNode.class);
                if (json != null && "Ok".equals(json.path("code").asText())) {
                    double[][] durations = readMatrix(json.path("durations"), places.size());
                    double[][] distances = readMatrix(json.path("distances"), places.size());
                    return new Matrix(durations, distances, true);
                }
            } catch (RuntimeException ignored) {
                // Deterministic estimate below; routingStatus tells the client it is not road data.
            }
        }
        double metersPerSecond = switch (transport) {
            case "walk" -> 1.4;
            case "bicycle" -> 4.2;
            case "motorbike" -> 8.33;
            default -> 7.0;
        };
        int n = places.size();
        double[][] seconds = new double[n][n];
        double[][] meters = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
            meters[i][j] = haversineMeters(places.get(i), places.get(j)) * 1.3;
            seconds[i][j] = meters[i][j] / metersPerSecond;
        }
        return new Matrix(seconds, meters, false);
    }

    private String normalizeTransport(String transport) {
        String value = transport == null ? "motorbike" : transport.trim().toLowerCase(java.util.Locale.ROOT);
        if (!List.of("motorbike", "car", "walk", "bicycle").contains(value)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TRANSPORT", "Phương tiện di chuyển không hợp lệ.");
        }
        return value;
    }

    private double[][] readMatrix(JsonNode node, int expectedSize) {
        if (!node.isArray() || node.size() != expectedSize) {
            throw new IllegalArgumentException("Routing matrix has an unexpected size");
        }
        int n = node.size();
        double[][] result = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
            JsonNode value = node.path(i).path(j);
            if (!value.isNumber() || !Double.isFinite(value.asDouble()) || value.asDouble() < 0) {
                throw new IllegalArgumentException("Routing matrix contains an invalid value");
            }
            result[i][j] = value.asDouble();
        }
        return result;
    }

    private Matrix subMatrix(Matrix matrix, List<Integer> indexes) {
        int n = indexes.size();
        double[][] seconds = new double[n][n];
        double[][] meters = new double[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
            seconds[i][j] = matrix.seconds()[indexes.get(i)][indexes.get(j)];
            meters[i][j] = matrix.meters()[indexes.get(i)][indexes.get(j)];
        }
        return new Matrix(seconds, meters, matrix.roadData());
    }

    /**
     * Chia các đoạn liên tiếp của tuyến toàn cục bằng dynamic programming.
     * Mục tiêu là giảm tải lớn nhất của một ngày, trong đó tải gồm thời lượng tham quan,
     * thời gian đường thực/ước tính và buffer chuyển điểm.
     */
    private List<List<Integer>> splitBalanced(
            List<Integer> order,
            int dayCount,
            Matrix matrix,
            List<PlacePoint> places) {
        int n = order.size();
        double[][] segmentLoad = new double[n][n];
        for (int start = 0; start < n; start++) {
            double load = 0;
            for (int end = start; end < n; end++) {
                int placeIndex = order.get(end);
                load += places.get(placeIndex).durationMin();
                if (end > start) {
                    int previousIndex = order.get(end - 1);
                    load += TRANSITION_BUFFER_MIN + matrix.seconds()[previousIndex][placeIndex] / 60.0;
                }
                segmentLoad[start][end] = load;
            }
        }

        double[][] best = new double[dayCount + 1][n + 1];
        int[][] parent = new int[dayCount + 1][n + 1];
        for (double[] row : best) Arrays.fill(row, Double.POSITIVE_INFINITY);
        best[0][0] = 0;
        for (int days = 1; days <= dayCount; days++) {
            for (int end = days; end <= n; end++) {
                for (int split = days - 1; split < end; split++) {
                    double candidate = Math.max(best[days - 1][split], segmentLoad[split][end - 1]);
                    if (candidate < best[days][end]) {
                        best[days][end] = candidate;
                        parent[days][end] = split;
                    }
                }
            }
        }

        List<List<Integer>> reversed = new ArrayList<>();
        int end = n;
        for (int days = dayCount; days >= 1; days--) {
            int split = parent[days][end];
            reversed.add(new ArrayList<>(order.subList(split, end)));
            end = split;
        }
        Collections.reverse(reversed);
        return reversed;
    }

    private List<Integer> optimalOrder(double[][] cost) {
        if (cost.length <= 1) return cost.length == 0 ? List.of() : List.of(0);
        return cost.length <= EXACT_PATH_LIMIT ? exactOpenPath(cost) : heuristicOpenPath(cost);
    }

    /** Exact shortest open Hamiltonian path for small days (directed matrices supported). */
    private List<Integer> exactOpenPath(double[][] cost) {
        int n = cost.length;
        int stateCount = 1 << n;
        double[][] dp = new double[stateCount][n];
        int[][] parent = new int[stateCount][n];
        for (int mask = 0; mask < stateCount; mask++) {
            Arrays.fill(dp[mask], Double.POSITIVE_INFINITY);
            Arrays.fill(parent[mask], -1);
        }
        for (int start = 0; start < n; start++) dp[1 << start][start] = 0;

        for (int mask = 1; mask < stateCount; mask++) {
            for (int last = 0; last < n; last++) {
                if ((mask & (1 << last)) == 0 || !Double.isFinite(dp[mask][last])) continue;
                for (int next = 0; next < n; next++) {
                    if ((mask & (1 << next)) != 0) continue;
                    int nextMask = mask | (1 << next);
                    double candidate = dp[mask][last] + cost[last][next];
                    if (candidate < dp[nextMask][next]) {
                        dp[nextMask][next] = candidate;
                        parent[nextMask][next] = last;
                    }
                }
            }
        }

        int mask = stateCount - 1;
        int last = 0;
        for (int i = 1; i < n; i++) if (dp[mask][i] < dp[mask][last]) last = i;
        List<Integer> reversed = new ArrayList<>();
        while (last >= 0) {
            reversed.add(last);
            int previous = parent[mask][last];
            mask ^= 1 << last;
            last = previous;
        }
        Collections.reverse(reversed);
        return reversed;
    }

    private List<Integer> heuristicOpenPath(double[][] cost) {
        List<Integer> best = null;
        double bestCost = Double.POSITIVE_INFINITY;
        for (int start = 0; start < cost.length; start++) {
            List<Integer> candidate = twoOpt(nearestNeighbor(cost, start), cost);
            double candidateCost = routeCost(candidate, cost);
            if (candidateCost < bestCost) {
                best = candidate;
                bestCost = candidateCost;
            }
        }
        return best == null ? List.of() : best;
    }

    private List<Integer> nearestNeighbor(double[][] cost, int start) {
        List<Integer> route = new ArrayList<>();
        boolean[] used = new boolean[cost.length];
        int current = start;
        route.add(current);
        used[current] = true;
        while (route.size() < cost.length) {
            int next = -1;
            for (int i = 0; i < cost.length; i++) {
                if (!used[i] && (next < 0 || cost[current][i] < cost[current][next])) next = i;
            }
            used[next] = true;
            route.add(next);
            current = next;
        }
        return route;
    }

    private List<Integer> twoOpt(List<Integer> initial, double[][] cost) {
        List<Integer> best = new ArrayList<>(initial);
        boolean improved = true;
        for (int pass = 0; pass < 30 && improved; pass++) {
            improved = false;
            for (int i = 0; i < best.size() - 1; i++) for (int j = i + 1; j < best.size(); j++) {
                List<Integer> candidate = new ArrayList<>(best);
                Collections.reverse(candidate.subList(i, j + 1));
                if (routeCost(candidate, cost) + 0.001 < routeCost(best, cost)) {
                    best = candidate;
                    improved = true;
                }
            }
        }
        return best;
    }

    private double routeCost(List<Integer> route, double[][] cost) {
        double total = 0;
        for (int i = 0; i + 1 < route.size(); i++) total += cost[route.get(i)][route.get(i + 1)];
        return total;
    }

    private void validatePoint(PlacePoint point) {
        if (point == null || point.id() == null || point.id().isBlank()
                || !Double.isFinite(point.lat()) || !Double.isFinite(point.lng())
                || Math.abs(point.lat()) > 90 || Math.abs(point.lng()) > 180
                || point.durationMin() < 15 || point.durationMin() > 720) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PLACE", "Địa điểm có tọa độ hoặc thời lượng không hợp lệ.");
        }
    }

    private double haversineMeters(PlacePoint a, PlacePoint b) {
        double p1 = Math.toRadians(a.lat()), p2 = Math.toRadians(b.lat());
        double dp = Math.toRadians(b.lat() - a.lat()), dl = Math.toRadians(b.lng() - a.lng());
        double h = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }
}

package com.danang.motorescue.service;

import com.danang.motorescue.config.RoutingProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Locale;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.StringJoiner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class RoadRoutingService {
    public record RoadPoint(double latitude, double longitude) {}
    public record RoadRoute(int distanceMeters, int durationSeconds, List<RoadPoint> coordinates) {}

    private static final Logger log = LoggerFactory.getLogger(RoadRoutingService.class);
    private final RestClient client;
    private final RoutingProperties properties;

    public RoadRoutingService(@Qualifier("routingRestClient") RestClient routingRestClient, RoutingProperties properties) {
        this.client = routingRestClient;
        this.properties = properties;
    }

    public Optional<RoadRoute> route(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude) {
        return requestRoute(fromLatitude, fromLongitude, toLatitude, toLongitude, false);
    }

    public Optional<RoadRoute> routeWithGeometry(
            double fromLatitude, double fromLongitude, double toLatitude, double toLongitude) {
        return requestRoute(fromLatitude, fromLongitude, toLatitude, toLongitude, true);
    }

    /**
     * Calculates road metrics from every origin to one destination. Origins are
     * split into bounded OSRM Table requests, then reassembled in their original
     * order. An empty item means that no drivable route was returned.
     */
    public List<Optional<RoadRoute>> routesToDestination(List<RoadPoint> origins, RoadPoint destination) {
        if (origins.isEmpty()) return List.of();
        if (!properties.isConfigured()) return emptyMetrics(origins.size());

        List<Optional<RoadRoute>> result = new ArrayList<>(origins.size());
        for (int start = 0; start < origins.size(); start += properties.tableBatchSize()) {
            int end = Math.min(start + properties.tableBatchSize(), origins.size());
            result.addAll(requestTable(origins.subList(start, end), destination));
        }
        return List.copyOf(result);
    }

    private List<Optional<RoadRoute>> requestTable(List<RoadPoint> origins, RoadPoint destination) {

        StringJoiner coordinates = new StringJoiner(";");
        StringJoiner sources = new StringJoiner(";");
        StringJoiner radiuses = new StringJoiner(";");
        for (int index = 0; index < origins.size(); index++) {
            RoadPoint origin = origins.get(index);
            coordinates.add(formatPoint(origin));
            sources.add(Integer.toString(index));
            radiuses.add(Integer.toString(properties.maxSnapRadiusMeters()));
        }
        coordinates.add(formatPoint(destination));
        radiuses.add(Integer.toString(properties.maxSnapRadiusMeters()));

        String url = properties.motorbikeBaseUrl() + "/table/v1/" + properties.profile() + "/" + coordinates
                + "?sources=" + sources + "&destinations=" + origins.size()
                + "&annotations=duration,distance&radiuses=" + radiuses;
        try {
            JsonNode body = client.get().uri(url).retrieve().body(JsonNode.class);
            if (body == null || !"Ok".equals(body.path("code").asText())) {
                return emptyMetrics(origins.size());
            }
            JsonNode durations = body.path("durations");
            JsonNode distances = body.path("distances");
            if (!durations.isArray() || !distances.isArray()
                    || durations.size() != origins.size() || distances.size() != origins.size()) {
                return emptyMetrics(origins.size());
            }

            List<Optional<RoadRoute>> result = new ArrayList<>(origins.size());
            for (int index = 0; index < origins.size(); index++) {
                JsonNode duration = durations.path(index).path(0);
                JsonNode distance = distances.path(index).path(0);
                if (!duration.isNumber() || !distance.isNumber()) {
                    result.add(Optional.empty());
                    continue;
                }
                result.add(Optional.of(new RoadRoute(
                        (int) Math.round(distance.asDouble()),
                        (int) Math.round(duration.asDouble()),
                        List.of())));
            }
            return List.copyOf(result);
        } catch (RestClientException ex) {
            // RestClient messages may contain the request URL and therefore exact coordinates.
            log.warn("Motorbike routing table unavailable ({})", ex.getClass().getSimpleName());
            return emptyMetrics(origins.size());
        }
    }

    private Optional<RoadRoute> requestRoute(
            double fromLatitude, double fromLongitude, double toLatitude, double toLongitude, boolean includeGeometry) {
        if (!properties.isConfigured()) return Optional.empty();
        String coordinates = String.format(Locale.US, "%.6f,%.6f;%.6f,%.6f",
                fromLongitude, fromLatitude, toLongitude, toLatitude);
        String url = properties.motorbikeBaseUrl() + "/route/v1/" + properties.profile() + "/" + coordinates
                + "?overview=" + (includeGeometry ? "full" : "false")
                + "&geometries=geojson&steps=false&alternatives=false"
                + "&radiuses=" + properties.maxSnapRadiusMeters() + ";" + properties.maxSnapRadiusMeters();
        try {
            JsonNode body = client.get().uri(url).retrieve().body(JsonNode.class);
            if (body == null || !"Ok".equals(body.path("code").asText()) || body.path("routes").isEmpty()) {
                return Optional.empty();
            }
            JsonNode route = body.path("routes").get(0);
            int distance = (int) Math.round(route.path("distance").asDouble(-1));
            int duration = (int) Math.round(route.path("duration").asDouble(-1));
            List<RoadPoint> points = new ArrayList<>();
            if (includeGeometry) {
                for (JsonNode point : route.path("geometry").path("coordinates")) {
                    if (point.isArray() && point.size() >= 2) {
                        JsonNode longitudeNode = point.get(0);
                        JsonNode latitudeNode = point.get(1);
                        if (!longitudeNode.isNumber() || !latitudeNode.isNumber()) continue;
                        double longitude = longitudeNode.asDouble();
                        double latitude = latitudeNode.asDouble();
                        if (Double.isFinite(latitude) && Double.isFinite(longitude)
                                && latitude >= -90 && latitude <= 90
                                && longitude >= -180 && longitude <= 180) {
                            points.add(new RoadPoint(latitude, longitude));
                        }
                    }
                }
                if (points.size() < 2) return Optional.empty();
            }
            return distance >= 0 && duration >= 0
                    ? Optional.of(new RoadRoute(distance, duration, List.copyOf(points)))
                    : Optional.empty();
        } catch (RestClientException ex) {
            log.warn("Motorbike routing service unavailable ({})", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private String formatPoint(RoadPoint point) {
        return String.format(Locale.US, "%.6f,%.6f", point.longitude(), point.latitude());
    }

    private List<Optional<RoadRoute>> emptyMetrics(int size) {
        List<Optional<RoadRoute>> result = new ArrayList<>(size);
        for (int index = 0; index < size; index++) result.add(Optional.empty());
        return List.copyOf(result);
    }
}

package com.danang.itinerary.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.routing")
public record RoutingProperties(
        String carBaseUrl,
        String motorbikeBaseUrl,
        String walkBaseUrl,
        String bicycleBaseUrl,
        int maxSnapRadiusMeters) {

    public RoutingProperties {
        maxSnapRadiusMeters = maxSnapRadiusMeters > 0 ? maxSnapRadiusMeters : 750;
    }

    public String baseUrlFor(String transport) {
        String value = switch (transport) {
            case "car" -> carBaseUrl;
            case "motorbike" -> motorbikeBaseUrl;
            case "walk" -> walkBaseUrl;
            case "bicycle" -> bicycleBaseUrl;
            default -> null;
        };
        if (value == null || value.isBlank()) return null;
        return value.trim().replaceAll("/+$", "");
    }
}

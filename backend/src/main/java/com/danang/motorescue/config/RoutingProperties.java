package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.routing")
public record RoutingProperties(
        String motorbikeBaseUrl,
        String profile,
        int maxSnapRadiusMeters,
        int tableBatchSize) {
    public RoutingProperties {
        motorbikeBaseUrl = normalize(motorbikeBaseUrl);
        profile = profile == null || !profile.trim().matches("^[a-z0-9_-]{2,40}$")
                ? "driving"
                : profile.trim();
        maxSnapRadiusMeters = maxSnapRadiusMeters > 0 ? maxSnapRadiusMeters : 750;
        // One destination is appended to every table request. Keeping origins at
        // 99 or fewer works with OSRM's common 100-coordinate default limit.
        tableBatchSize = Math.max(1, Math.min(tableBatchSize, 99));
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().replaceAll("/+$", "");
    }

    public boolean isConfigured() {
        return motorbikeBaseUrl != null;
    }
}

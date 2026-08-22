package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.service-area")
public record ServiceAreaProperties(
        double minLatitude,
        double maxLatitude,
        double minLongitude,
        double maxLongitude) {
    public boolean contains(double latitude, double longitude) {
        return latitude >= minLatitude && latitude <= maxLatitude
                && longitude >= minLongitude && longitude <= maxLongitude;
    }
}

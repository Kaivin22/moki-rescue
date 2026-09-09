package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.matching")
public record MatchingProperties(
        int providerLocationMaxAgeSeconds,
        int providerLocationMaxAccuracyMeters) {
    public MatchingProperties {
        providerLocationMaxAgeSeconds = Math.max(30, Math.min(providerLocationMaxAgeSeconds, 900));
        providerLocationMaxAccuracyMeters = Math.max(20, Math.min(providerLocationMaxAccuracyMeters, 1000));
    }
}

package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.matching")
public record MatchingProperties(
        int offerCount,
        int offerTtlSeconds,
        int providerLocationMaxAgeSeconds,
        int providerLocationMaxAccuracyMeters) {
    public MatchingProperties {
        offerCount = Math.max(1, Math.min(offerCount, 5));
        offerTtlSeconds = Math.max(20, Math.min(offerTtlSeconds, 180));
        providerLocationMaxAgeSeconds = Math.max(30, Math.min(providerLocationMaxAgeSeconds, 900));
        providerLocationMaxAccuracyMeters = Math.max(20, Math.min(providerLocationMaxAccuracyMeters, 1000));
    }
}

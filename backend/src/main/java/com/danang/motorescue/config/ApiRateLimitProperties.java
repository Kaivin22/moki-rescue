package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rate-limit")
public record ApiRateLimitProperties(
        int mutationsPerMinute,
        int locationUpdatesPerMinute,
        int assistantAttemptsPerMinute) {
    public ApiRateLimitProperties {
        mutationsPerMinute = Math.max(10, Math.min(mutationsPerMinute, 300));
        locationUpdatesPerMinute = Math.max(6, Math.min(locationUpdatesPerMinute, 120));
        assistantAttemptsPerMinute = Math.max(3, Math.min(assistantAttemptsPerMinute, 30));
    }
}

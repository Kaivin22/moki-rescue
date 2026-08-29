package com.danang.motorescue.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rescue-policy")
public record RescuePolicyProperties(
        Duration createWindow,
        int maxCreatesPerWindow,
        int requestListLimit,
        int checkpointDedupeSeconds,
        Duration lateCancellationWindow,
        int maxLateCancellations,
        Duration lateCancellationCooldown,
        Duration cancellationEvidenceMaxAge,
        int arrivalProximityMeters,
        int customerGpsMaxAccuracyMeters,
        Duration reviewWindow) {
    public RescuePolicyProperties {
        createWindow = createWindow == null ? Duration.ofMinutes(10) : createWindow;
        long seconds = Math.max(60, Math.min(createWindow.toSeconds(), 3_600));
        createWindow = Duration.ofSeconds(seconds);
        maxCreatesPerWindow = Math.max(1, Math.min(maxCreatesPerWindow, 20));
        requestListLimit = Math.max(20, Math.min(requestListLimit, 200));
        checkpointDedupeSeconds = Math.max(1, Math.min(checkpointDedupeSeconds, 30));
        lateCancellationWindow = clamp(lateCancellationWindow, Duration.ofDays(30),
                Duration.ofDays(1), Duration.ofDays(90));
        maxLateCancellations = Math.max(2, Math.min(maxLateCancellations, 10));
        lateCancellationCooldown = clamp(lateCancellationCooldown, Duration.ofHours(24),
                Duration.ofHours(1), Duration.ofHours(72));
        cancellationEvidenceMaxAge = clampMinutes(cancellationEvidenceMaxAge, Duration.ofMinutes(5), 1, 15);
        arrivalProximityMeters = Math.max(50, Math.min(arrivalProximityMeters, 500));
        customerGpsMaxAccuracyMeters = Math.max(20, Math.min(customerGpsMaxAccuracyMeters, 500));
        reviewWindow = clamp(reviewWindow, Duration.ofDays(30), Duration.ofDays(1), Duration.ofDays(90));
    }

    private static Duration clamp(Duration value, Duration fallback, Duration minimum, Duration maximum) {
        Duration selected = value == null ? fallback : value;
        long seconds = Math.max(minimum.toSeconds(), Math.min(selected.toSeconds(), maximum.toSeconds()));
        return Duration.ofSeconds(seconds);
    }

    private static Duration clampMinutes(Duration value, Duration fallback, long minMinutes, long maxMinutes) {
        Duration selected = value == null ? fallback : value;
        long seconds = Math.max(Duration.ofMinutes(minMinutes).toSeconds(),
                Math.min(selected.toSeconds(), Duration.ofMinutes(maxMinutes).toSeconds()));
        return Duration.ofSeconds(seconds);
    }
}

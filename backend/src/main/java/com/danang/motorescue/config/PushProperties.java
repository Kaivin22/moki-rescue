package com.danang.motorescue.config;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.push")
public record PushProperties(
        String expoUrl,
        String receiptUrl,
        String accessToken,
        Duration sendInitialBackoff,
        int sendMaxAttempts,
        Duration receiptInitialDelay,
        Duration receiptRetryDelay,
        Duration receiptMaxAge,
        int receiptMaxAttempts,
        int receiptBatchSize,
        long receiptScanIntervalMs) {
    public PushProperties {
        expoUrl = requireHttps(expoUrl, "app.push.expo-url");
        receiptUrl = requireHttps(receiptUrl, "app.push.receipt-url");
        accessToken = accessToken == null ? "" : accessToken.trim();
        sendInitialBackoff = clamp(
                sendInitialBackoff, Duration.ofSeconds(1), Duration.ofMillis(250), Duration.ofSeconds(10));
        sendMaxAttempts = Math.max(1, Math.min(sendMaxAttempts, 5));
        receiptInitialDelay = clamp(
                receiptInitialDelay, Duration.ofMinutes(15), Duration.ofMinutes(1), Duration.ofHours(1));
        receiptRetryDelay = clamp(
                receiptRetryDelay, Duration.ofMinutes(5), Duration.ofMinutes(1), Duration.ofHours(1));
        receiptMaxAge = clamp(
                receiptMaxAge, Duration.ofHours(23), Duration.ofHours(1), Duration.ofHours(23));
        receiptMaxAttempts = Math.max(1, Math.min(receiptMaxAttempts, 20));
        receiptBatchSize = Math.max(1, Math.min(receiptBatchSize, 1_000));
        receiptScanIntervalMs = Math.max(15_000, Math.min(receiptScanIntervalMs, 900_000));
    }

    private static Duration clamp(Duration value, Duration fallback, Duration minimum, Duration maximum) {
        Duration candidate = value == null ? fallback : value;
        if (candidate.compareTo(minimum) < 0) return minimum;
        if (candidate.compareTo(maximum) > 0) return maximum;
        return candidate;
    }

    private static String requireHttps(String value, String propertyName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(propertyName + " is required");
        URI uri = URI.create(value.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException(propertyName + " must be an HTTPS URL");
        }
        return uri.toString();
    }
}

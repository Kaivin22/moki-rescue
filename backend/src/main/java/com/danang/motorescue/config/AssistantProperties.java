package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.assistant")
public record AssistantProperties(
        boolean enabled,
        String baseUrl,
        String apiKey,
        String model,
        int requestsPerMinute,
        int requestsPerDay,
        int maxOutputTokens) {
    public AssistantProperties {
        baseUrl = normalizeBaseUrl(baseUrl);
        apiKey = apiKey == null ? "" : apiKey.trim();
        model = model == null || !model.matches("^[A-Za-z0-9._-]{2,80}$")
                ? "gemini-2.5-flash-lite"
                : model;
        requestsPerMinute = Math.max(1, Math.min(requestsPerMinute, 20));
        requestsPerDay = Math.max(requestsPerMinute, Math.min(requestsPerDay, 200));
        maxOutputTokens = Math.max(100, Math.min(maxOutputTokens, 800));
    }

    private static String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "https://generativelanguage.googleapis.com/v1beta";
        }
        return value.trim().replaceAll("/+$", "");
    }

    public boolean isConfigured() {
        return enabled && !apiKey.isBlank();
    }
}

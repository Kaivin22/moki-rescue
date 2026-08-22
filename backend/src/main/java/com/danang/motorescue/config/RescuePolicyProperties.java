package com.danang.motorescue.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rescue-policy")
public record RescuePolicyProperties(
        Duration createWindow,
        int maxCreatesPerWindow,
        int requestListLimit,
        int checkpointDedupeSeconds) {
    public RescuePolicyProperties {
        createWindow = createWindow == null ? Duration.ofMinutes(10) : createWindow;
        long seconds = Math.max(60, Math.min(createWindow.toSeconds(), 3_600));
        createWindow = Duration.ofSeconds(seconds);
        maxCreatesPerWindow = Math.max(1, Math.min(maxCreatesPerWindow, 20));
        requestListLimit = Math.max(20, Math.min(requestListLimit, 200));
        checkpointDedupeSeconds = Math.max(1, Math.min(checkpointDedupeSeconds, 30));
    }
}

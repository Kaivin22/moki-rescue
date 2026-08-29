package com.danang.motorescue.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.case-lifecycle")
public record CaseLifecycleProperties(
        Duration assignedStartTimeout,
        Duration providerGpsStaleAfter,
        Duration arrivalConfirmationTimeout,
        Duration quoteDecisionTimeout,
        Duration completionConfirmationTimeout,
        Duration workProgressTimeout,
        Duration customerRetryCooldown,
        int maxCustomerRetries) {
    public CaseLifecycleProperties {
        assignedStartTimeout = clamp(assignedStartTimeout, Duration.ofMinutes(10), 2, 60);
        providerGpsStaleAfter = clamp(providerGpsStaleAfter, Duration.ofMinutes(5), 1, 30);
        arrivalConfirmationTimeout = clamp(arrivalConfirmationTimeout, Duration.ofMinutes(10), 2, 60);
        quoteDecisionTimeout = clamp(quoteDecisionTimeout, Duration.ofMinutes(20), 5, 120);
        completionConfirmationTimeout = clamp(completionConfirmationTimeout, Duration.ofMinutes(15), 5, 120);
        workProgressTimeout = clamp(workProgressTimeout, Duration.ofHours(2), 30, 12 * 60);
        customerRetryCooldown = clamp(customerRetryCooldown, Duration.ofMinutes(2), 1, 30);
        maxCustomerRetries = Math.max(1, Math.min(maxCustomerRetries, 5));
    }

    private static Duration clamp(Duration value, Duration fallback, long minMinutes, long maxMinutes) {
        Duration selected = value == null ? fallback : value;
        long seconds = Math.max(Duration.ofMinutes(minMinutes).toSeconds(),
                Math.min(selected.toSeconds(), Duration.ofMinutes(maxMinutes).toSeconds()));
        return Duration.ofSeconds(seconds);
    }
}

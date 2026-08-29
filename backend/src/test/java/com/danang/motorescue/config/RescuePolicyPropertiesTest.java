package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RescuePolicyPropertiesTest {
    @Test
    void clampsUnsafeOperationalValues() {
        RescuePolicyProperties properties = new RescuePolicyProperties(
                Duration.ofSeconds(1), 0, 5, 0,
                Duration.ofHours(1), 0, Duration.ofMinutes(1), Duration.ofSeconds(1), 1, 1,
                Duration.ofHours(1));

        assertThat(properties.createWindow()).isEqualTo(Duration.ofMinutes(1));
        assertThat(properties.maxCreatesPerWindow()).isEqualTo(1);
        assertThat(properties.requestListLimit()).isEqualTo(20);
        assertThat(properties.checkpointDedupeSeconds()).isEqualTo(1);
        assertThat(properties.lateCancellationWindow()).isEqualTo(Duration.ofDays(1));
        assertThat(properties.maxLateCancellations()).isEqualTo(2);
        assertThat(properties.lateCancellationCooldown()).isEqualTo(Duration.ofHours(1));
        assertThat(properties.cancellationEvidenceMaxAge()).isEqualTo(Duration.ofMinutes(1));
        assertThat(properties.arrivalProximityMeters()).isEqualTo(50);
        assertThat(properties.customerGpsMaxAccuracyMeters()).isEqualTo(20);
        assertThat(properties.reviewWindow()).isEqualTo(Duration.ofDays(1));
    }
}

package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiRateLimitPropertiesTest {
    @Test
    void clampsLimitsToOperationalBounds() {
        ApiRateLimitProperties properties = new ApiRateLimitProperties(1, 1_000, 0);

        assertThat(properties.mutationsPerMinute()).isEqualTo(10);
        assertThat(properties.locationUpdatesPerMinute()).isEqualTo(120);
        assertThat(properties.assistantAttemptsPerMinute()).isEqualTo(3);
    }
}

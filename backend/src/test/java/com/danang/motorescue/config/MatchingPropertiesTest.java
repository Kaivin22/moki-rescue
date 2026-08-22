package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MatchingPropertiesTest {
    @Test
    void clampsOperationalValuesToSafeBounds() {
        MatchingProperties properties = new MatchingProperties(20, 5, 5, 5_000);

        assertThat(properties.offerCount()).isEqualTo(5);
        assertThat(properties.offerTtlSeconds()).isEqualTo(20);
        assertThat(properties.providerLocationMaxAgeSeconds()).isEqualTo(30);
        assertThat(properties.providerLocationMaxAccuracyMeters()).isEqualTo(1_000);
    }

    @Test
    void preservesProductionDefaults() {
        MatchingProperties properties = new MatchingProperties(3, 45, 180, 150);

        assertThat(properties.providerLocationMaxAccuracyMeters()).isEqualTo(150);
    }
}

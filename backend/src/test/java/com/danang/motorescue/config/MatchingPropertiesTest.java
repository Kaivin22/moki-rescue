package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MatchingPropertiesTest {
    @Test
    void clampsOperationalValuesToSafeBounds() {
        MatchingProperties properties = new MatchingProperties(5, 5_000);

        assertThat(properties.providerLocationMaxAgeSeconds()).isEqualTo(30);
        assertThat(properties.providerLocationMaxAccuracyMeters()).isEqualTo(1_000);
    }

    @Test
    void preservesProductionDefaults() {
        MatchingProperties properties = new MatchingProperties(180, 150);

        assertThat(properties.providerLocationMaxAgeSeconds()).isEqualTo(180);
        assertThat(properties.providerLocationMaxAccuracyMeters()).isEqualTo(150);
    }
}

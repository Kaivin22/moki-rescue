package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RoutingPropertiesTest {
    @Test
    void normalizesBaseUrlAndDefaultsProfile() {
        RoutingProperties properties = new RoutingProperties("https://router.example///", "", -1, 1_000);
        assertThat(properties.motorbikeBaseUrl()).isEqualTo("https://router.example");
        assertThat(properties.profile()).isEqualTo("driving");
        assertThat(properties.maxSnapRadiusMeters()).isEqualTo(750);
        assertThat(properties.tableBatchSize()).isEqualTo(99);
        assertThat(properties.isConfigured()).isTrue();
    }

    @Test
    void blankRouterIsNotConfiguredAndMustNotBecomeStraightLineFallback() {
        RoutingProperties properties = new RoutingProperties(" ", "driving", 500, 80);
        assertThat(properties.isConfigured()).isFalse();
    }

    @Test
    void rejectsUnsafeProfileNames() {
        RoutingProperties properties = new RoutingProperties("https://router.example", "driving?leak=true", 500, 0);
        assertThat(properties.profile()).isEqualTo("driving");
        assertThat(properties.tableBatchSize()).isEqualTo(1);
    }
}

package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RescuePolicyPropertiesTest {
    @Test
    void clampsUnsafeOperationalValues() {
        RescuePolicyProperties properties = new RescuePolicyProperties(Duration.ofSeconds(1), 0, 5, 0);

        assertThat(properties.createWindow()).isEqualTo(Duration.ofMinutes(1));
        assertThat(properties.maxCreatesPerWindow()).isEqualTo(1);
        assertThat(properties.requestListLimit()).isEqualTo(20);
        assertThat(properties.checkpointDedupeSeconds()).isEqualTo(1);
    }
}

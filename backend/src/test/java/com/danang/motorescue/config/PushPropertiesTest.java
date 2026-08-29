package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class PushPropertiesTest {
    @Test
    void clampsReceiptPollingToExpoLimits() {
        PushProperties properties = new PushProperties(
                "https://exp.host/send",
                "https://exp.host/receipts",
                null,
                Duration.ofMillis(1),
                100,
                Duration.ofSeconds(1),
                Duration.ofHours(2),
                Duration.ofDays(2),
                100,
                5_000,
                1);

        assertThat(properties.accessToken()).isEmpty();
        assertThat(properties.sendInitialBackoff()).isEqualTo(Duration.ofMillis(250));
        assertThat(properties.sendMaxAttempts()).isEqualTo(5);
        assertThat(properties.receiptInitialDelay()).isEqualTo(Duration.ofMinutes(1));
        assertThat(properties.receiptRetryDelay()).isEqualTo(Duration.ofHours(1));
        assertThat(properties.receiptMaxAge()).isEqualTo(Duration.ofHours(23));
        assertThat(properties.receiptMaxAttempts()).isEqualTo(20);
        assertThat(properties.receiptBatchSize()).isEqualTo(1_000);
        assertThat(properties.receiptScanIntervalMs()).isEqualTo(15_000);
    }

    @Test
    void rejectsNonHttpsPushEndpoints() {
        assertThatThrownBy(() -> new PushProperties(
                        "http://exp.host/send",
                        "https://exp.host/receipts",
                        "",
                        null,
                        3,
                        null,
                        null,
                        null,
                        6,
                        1_000,
                        60_000))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.push.expo-url");
    }
}

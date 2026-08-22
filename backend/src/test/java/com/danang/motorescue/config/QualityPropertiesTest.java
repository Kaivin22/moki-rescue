package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class QualityPropertiesTest {
    private final QualityProperties policy = new QualityProperties(5, 3.5, 3.0, 3, 3, 30);

    @Test
    void waitsForEnoughRealRatingsBeforeOpeningAnAlert() {
        assertThat(policy.alertSeverity(2.0, 4)).isNull();
        assertThat(policy.alertSeverity(3.5, 20)).isNull();
        assertThat(policy.alertSeverity(3.49, 5)).isEqualTo("warning");
        assertThat(policy.alertSeverity(2.99, 5)).isEqualTo("critical");
    }

    @Test
    void spacesRepeatedWarningsAndNeverDefinesAutomaticSuspension() {
        assertThat(policy.canRepeat(null, 5)).isTrue();
        assertThat(policy.canRepeat(5, 7)).isFalse();
        assertThat(policy.canRepeat(5, 8)).isTrue();
        assertThat(policy.recommendsSuspensionReview(2)).isFalse();
        assertThat(policy.recommendsSuspensionReview(3)).isTrue();
    }
}

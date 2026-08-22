package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PartnerVerificationPolicyTest {
    @Test
    void requiresProviderCapabilityAndEveryRequiredCheck() {
        assertThat(PartnerVerificationPolicy.isReady(1, 1, 6, 6)).isTrue();
        assertThat(PartnerVerificationPolicy.isReady(0, 1, 6, 6)).isFalse();
        assertThat(PartnerVerificationPolicy.isReady(1, 0, 6, 6)).isFalse();
        assertThat(PartnerVerificationPolicy.isReady(1, 1, 5, 6)).isFalse();
        assertThat(PartnerVerificationPolicy.isReady(1, 1, 0, 0)).isFalse();
    }

    @Test
    void normalizesInternalReferenceWithoutLocaleDependentCaseRules() {
        assertThat(PartnerVerificationPolicy.normalizeReference(" mr-dn-2026-0001 "))
                .isEqualTo("MR-DN-2026-0001");
    }
}

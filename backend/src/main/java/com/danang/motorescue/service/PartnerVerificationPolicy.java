package com.danang.motorescue.service;

import java.util.Locale;

public final class PartnerVerificationPolicy {
    private PartnerVerificationPolicy() {}

    public static boolean isReady(
            int activeProviderCount,
            int capabilityCount,
            int completedRequiredCount,
            int requiredCount) {
        return activeProviderCount > 0
                && capabilityCount > 0
                && requiredCount > 0
                && completedRequiredCount == requiredCount;
    }

    public static String normalizeReference(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }
}

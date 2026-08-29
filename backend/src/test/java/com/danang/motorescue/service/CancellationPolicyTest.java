package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.web.ApiException;
import org.junit.jupiter.api.Test;

class CancellationPolicyTest {
    private final CancellationPolicy policy = new CancellationPolicy();

    @Test
    void marksCustomerCancellationAfterDepartureAsLate() {
        var decision = policy.evaluate("customer", "en_route", "issue_resolved", "");
        assertThat(decision.stage()).isEqualTo("en_route");
        assertThat(decision.late()).isTrue();
    }

    @Test
    void treatsCancellationAfterArrivalClaimAsDispute() {
        var decision = policy.evaluate(
                "customer", "awaiting_arrival_confirmation", "provider_not_present", "");
        assertThat(decision.stage()).isEqualTo("arrival_disputed");
        assertThat(decision.arrivalDisputed()).isTrue();
    }

    @Test
    void allowsCancellationWhileWaitingForReassignmentWithoutLatePenalty() {
        var decision = policy.evaluate("customer", "needs_dispatch", "changed_mind", "");
        assertThat(decision.stage()).isEqualTo("reassignment");
        assertThat(decision.late()).isFalse();
        assertThat(decision.arrivalDisputed()).isFalse();
    }

    @Test
    void customerCannotSelfCancelAfterArrivalWasConfirmed() {
        assertThatThrownBy(() -> policy.evaluate("customer", "arrived", "changed_mind", ""))
                .isInstanceOf(ApiException.class)
                .extracting(error -> ((ApiException) error).code())
                .isEqualTo("INVALID_REQUEST_ACTION");
    }

    @Test
    void otherAndOperationalReasonsRequireANote() {
        assertThatThrownBy(() -> policy.evaluate("customer", "assigned", "other", "ngắn"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> policy.evaluate("provider", "en_route", "safety_issue", ""))
                .isInstanceOf(ApiException.class);
    }
}

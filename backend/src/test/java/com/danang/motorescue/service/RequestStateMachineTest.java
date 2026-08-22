package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.web.ApiException;
import org.junit.jupiter.api.Test;

class RequestStateMachineTest {
    private final RequestStateMachine machine = new RequestStateMachine();

    @Test
    void providerCannotCompleteWithoutCustomerConfirmation() {
        assertThat(machine.next("provider", "repairing", "request_completion"))
                .isEqualTo("awaiting_completion");
        assertThatThrownBy(() -> machine.next("provider", "awaiting_completion", "confirm_completion"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void customerControlsArrivalAndCompletionConfirmation() {
        assertThat(machine.next("customer", "awaiting_arrival_confirmation", "confirm_arrival"))
                .isEqualTo("arrived");
        assertThat(machine.next("customer", "awaiting_completion", "confirm_completion"))
                .isEqualTo("completed");
    }

    @Test
    void rejectsActionsFromWrongStateOrRole() {
        assertThatThrownBy(() -> machine.next("customer", "searching", "confirm_completion"))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> machine.next("dispatcher", "assigned", "start_trip"))
                .isInstanceOf(ApiException.class);
    }
}

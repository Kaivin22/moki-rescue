package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.*;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.SimpleTransactionStatus;

class RescueFlowTest {
    private final UUID id = UUID.randomUUID();
    private final Actor provider = new Actor(UUID.randomUUID(), "Provider", "provider", "vi");
    private int writes, alerts;
    private Object[] stateUpdate;
    private RescueRequestData current;
    private final JdbcTemplate jdbc = new JdbcTemplate() {
        @Override public int update(String sql, Object... args) {
            writes++;
            if (sql.contains("base_price_vnd = CASE")) stateUpdate = args;
            return 1;
        }
    };
    private final RescueRequestAccess access = new RescueRequestAccess(jdbc) {
        @Override RescueRequestData requireParticipant(Actor actor, UUID requestId) { return current; }
        @Override void setActor(UUID actorId) { }
    };
    private final RescueNotificationService notifications = new RescueNotificationService(jdbc, null) {
        @Override void notifyCounterparty(Actor actor, UUID requestId, NotificationKind kind, String detail) { alerts++; }
    };
    private final TransactionTemplate tx = new TransactionTemplate() {
        @Override public <T> T execute(TransactionCallback<T> action) {
            return action.doInTransaction(new SimpleTransactionStatus());
        }
    };
    private RescueLifecycleService service(String state) {
        current = new com.fasterxml.jackson.databind.ObjectMapper().convertValue(
                java.util.Map.of("status", state), RescueRequestData.class);
        return new RescueLifecycleService(jdbc, tx, null, new RequestStateMachine(), null,
                new AuditService(jdbc), null, access, notifications);
    }
    @Test void missingNegativeOrExcessiveBasePriceCannotStartTrip() {
        var service = service("assigned");
        for (Long price : new Long[]{null, -1L, 100_000_001L}) {
            assertThatThrownBy(() -> service.act(provider, id,
                    new StateActionRequest("start_trip", null, null, null, 1, price)))
                    .isInstanceOf(ApiException.class);
        }
        assertThat(writes).isZero();
        assertThat(alerts).isZero();
    }
    @Test void basePriceAndDepartureAreSavedTogetherIncludingExplicitZero() {
        var service = service("assigned");
        service.act(provider, id, new StateActionRequest("start_trip", null, null, null, 1, 0L));
        assertThat(stateUpdate).containsExactly("en_route", null, "start_trip", 0L, id, 1, provider.id(), provider.id());
        assertThat(alerts).isEqualTo(1);
    }
    @Test void arrivalAndCompletionUseProviderActionsWhileCustomerCanDisputeArrival() {
        var machine = new RequestStateMachine();
        assertThatThrownBy(() -> machine.next("provider", "en_route", "start_diagnosis"))
                .isInstanceOf(ApiException.class);
        assertThat(machine.next("customer", "awaiting_arrival_confirmation", "confirm_arrival"))
                .isEqualTo("diagnosing");
        assertThat(machine.next("customer", "awaiting_arrival_confirmation", "reject_arrival"))
                .isEqualTo("en_route");
        assertThatThrownBy(() -> machine.next("provider", "awaiting_completion", "confirm_completion"))
                .isInstanceOf(ApiException.class);
        assertThat(machine.next("provider", "en_route", "request_arrival")).isEqualTo("diagnosing");
        assertThat(machine.next("provider", "repairing", "request_completion")).isEqualTo("completed");
        assertThat(machine.next("customer", "diagnosing", "reject_arrival")).isEqualTo("en_route");
    }
    @Test void fixedServiceCanFinishAfterMeetingButQuotedServiceCannotSkipPriceApproval() {
        var service = service("diagnosing");
        current = new com.fasterxml.jackson.databind.ObjectMapper().convertValue(
                java.util.Map.of("status", "diagnosing", "serviceRequiresQuote", true), RescueRequestData.class);
        // A quoted service cannot be marked done before a quote is approved.
        assertThatThrownBy(() -> service.act(provider, id,
                new StateActionRequest("request_completion", null, null, null, 1)))
                .isInstanceOf(RuntimeException.class);
        assertThat(writes).isZero();
        var fixedService = service("diagnosing");
        fixedService.act(provider, id, new StateActionRequest("request_completion", null, null, null, 1));
        assertThat(stateUpdate[0]).isEqualTo("completed");
        assertThat(stateUpdate[1]).isEqualTo("repair");
    }
}

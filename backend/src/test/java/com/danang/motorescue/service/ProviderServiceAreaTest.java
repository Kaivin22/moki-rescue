package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.model.ApiModels.AvailabilityRequest;
import com.danang.motorescue.model.ApiModels.ProviderLocationRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class ProviderServiceAreaTest {
    private final List<String> events = new ArrayList<>();
    private final Actor actor = new Actor(UUID.randomUUID(), "Test provider", "provider", "vi");
    private final JdbcTemplate jdbc = new JdbcTemplate() {
        @Override public int update(String sql, Object... args) {
            assertThat(sql).contains("UPDATE public.provider_members", "is_available = FALSE", "last_latitude = NULL");
            assertThat(sql).doesNotContain("rescue_requests", "cancelled");
            assertThat(args).containsExactly(actor.id());
            events.add("disable");
            return 1;
        }
    };
    private final ProviderService service = new ProviderService(jdbc,
            new TransactionTemplate() {
                @Override public <T> T execute(TransactionCallback<T> callback) {
                    T result = callback.doInTransaction(new SimpleTransactionStatus());
                    events.add("commit");
                    return result;
                }
            }, null, new AuditService(jdbc) {
                @Override public void record(UUID id, String action, String entity, Object entityId) {
                    assertThat(action).isEqualTo("provider.outside_service_area");
                    events.add("audit");
                }
            }, null, new MatchingProperties(180, 150), null, null,
            new ServiceAreaService(jdbc) {
                @Override public boolean contains(double lat, double lon) { return false; }
            });

    @Test
    void rejectsActivationOutsideAndCommitsOffBeforeReturningError() {
        assertThatThrownBy(() -> service.setAvailability(actor, new AvailabilityRequest(true, 16.19, 108.22, 10.0)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("PROVIDER_OUTSIDE_SERVICE_AREA"));
        assertThat(events).containsExactly("disable", "audit", "commit");
    }

    @Test
    void rejectsAvailabilityGpsOutsideAndDoesNotKeepOldMatchingPosition() {
        assertThatThrownBy(() -> service.saveAvailabilityLocation(actor, new ProviderLocationRequest(15.94, 108.22, 10.0)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("PROVIDER_OUTSIDE_SERVICE_AREA"));
        assertThat(events).containsExactly("disable", "audit", "commit");
    }
}

package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.model.ApiModels.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class ProviderServiceAreaTest {
    private final Actor actor = new Actor(UUID.randomUUID(), "Test provider", "provider", "vi");
    private final List<String> calls = new ArrayList<>();
    private final JdbcTemplate jdbc = new JdbcTemplate() {
        @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
            assertThat(sql).contains("assigned_provider_id = ?");
            assertThat(args).containsExactly(actor.id());
            calls.add("busy-check");
            return type.cast(false);
        }
        @Override public int update(String sql, Object... args) {
            assertThat(sql).contains("public.api_is_in_service_area(team.base_latitude, team.base_longitude)", "last_latitude = NULL");
            assertThat(args).containsExactly(true, true, true, actor.id(), true);
            calls.add("available");
            return 1;
        }
    };
    private final AuditService audit = new AuditService(jdbc) {
        @Override public void record(UUID id, String action, String entity, Object entityId) {
            assertThat(id).isEqualTo(actor.id());
            assertThat(action).isEqualTo("provider.available");
            calls.add("audit");
        }
    };
    private final TransactionTemplate transactions = new TransactionTemplate() {
        @Override public <T> T execute(TransactionCallback<T> callback) {
            return callback.doInTransaction(new SimpleTransactionStatus());
        }
    };
    private ProviderService service(boolean validShop, String memberStatus, String teamStatus) {
        return new ProviderService(jdbc, transactions, null, audit, null, null) {
            @Override public ProviderStatusResponse status(Actor actor) {
                return new ProviderStatusResponse(false, "Shop", memberStatus, new RatingSummary(null, 0),
                        0, false, null, teamStatus, 16.061, 108.2238, validShop);
            }
        };
    }

    @Test void validShopAcceptsAvailabilityWithoutGps() {
        service(true, "active", "verified").setAvailability(actor, new AvailabilityRequest(true, null, null, null));
        assertThat(calls).containsExactly("busy-check", "available", "audit");
    }

    @Test void liveGpsOutsideCoverageDoesNotReplaceValidShop() {
        service(true, "active", "verified").setAvailability(actor, new AvailabilityRequest(true, 10.77, 106.7, 10.0));
        assertThat(calls).containsExactly("busy-check", "available", "audit");
    }

    @Test void invalidShopCannotUsePhoneGpsToBypassCoverage() {
        assertThatThrownBy(() -> service(false, "active", "verified").setAvailability(actor,
                new AvailabilityRequest(true, 16.06, 108.22, 10.0)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("SHOP_OUTSIDE_SERVICE_AREA"));
        assertThat(calls).isEmpty();
    }

    @Test void pendingAndRejectedMembersCannotGoAvailable() {
        for (String status : new String[] {"pending", "rejected", "suspended"}) {
            assertThatThrownBy(() -> service(true, status, "verified").setAvailability(actor,
                    new AvailabilityRequest(true, null, null, null)))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("PROVIDER_NOT_READY"));
        }
        assertThat(calls).isEmpty();
    }

    @Test void retiredGpsEndpointNeverWritesCoordinatesOrDisablesShift() {
        assertThatThrownBy(() -> service(true, "active", "verified").saveAvailabilityLocation(actor,
                new ProviderLocationRequest(15.94, 108.22, 10.0)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("PROVIDER_NOT_AVAILABLE"));
        assertThat(calls).isEmpty();
    }
}

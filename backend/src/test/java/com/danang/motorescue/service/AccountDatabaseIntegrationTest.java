package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.config.AssistantProperties;
import com.danang.motorescue.model.ApiModels.PushDeviceRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class AccountDatabaseIntegrationTest extends PostgisIntegrationTestSupport {
    @Container
    private static final PostgreSQLContainer<?> POSTGRES = newPostgisContainer();
    private static JdbcTemplate owner;
    private static JdbcTemplate runtime;
    private static TransactionTemplate transactions;
    private AccountService accounts;

    @BeforeAll
    static void migrate() {
        flywayFor(POSTGRES).migrate();
        owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        var dataSource = runtimeDataSourceFor(POSTGRES);
        runtime = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
    }

    @BeforeEach
    void reset() {
        owner.execute("TRUNCATE auth.users CASCADE");
        accounts = new AccountService(runtime, transactions, new AuditService(runtime));
    }

    @Test
    void registrationAndAccountSwitchUseActualRuntimeRole() {
        Actor first = actor("customer");
        Actor second = actor("customer");
        var input = new PushDeviceRequest("ExpoPushToken[integration]", UUID.randomUUID(), "android");
        accounts.registerPushDevice(first, input);
        accounts.registerPushDevice(first, input);
        accounts.registerPushDevice(second, input);
        assertThat(runtime.queryForObject("SELECT current_user", String.class)).isEqualTo("motorescue_api");
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.push_devices", Integer.class)).isEqualTo(1);
        assertThat(owner.queryForObject("SELECT user_id FROM public.push_devices", UUID.class)).isEqualTo(second.id());
        accounts.unregisterPushDevice(first, input.token(), input.installationId());
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.push_devices", Integer.class)).isEqualTo(1);
        accounts.unregisterPushDevice(second, input.token(), input.installationId());
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.push_devices", Integer.class)).isZero();
    }

    @Test
    void deletionDisablesProfileAndPushAndRecordsAuditAtomically() {
        Actor customer = actor("customer");
        accounts.registerPushDevice(customer,
                new PushDeviceRequest("ExpoPushToken[delete]", UUID.randomUUID(), "ios"));
        accounts.requestDeletion(customer);
        assertThat(owner.queryForObject("SELECT is_active FROM public.profiles WHERE id = ?",
                Boolean.class, customer.id())).isFalse();
        assertThat(owner.queryForObject("SELECT deletion_requested_at IS NOT NULL FROM public.profiles WHERE id = ?",
                Boolean.class, customer.id())).isTrue();
        assertThat(owner.queryForObject("SELECT is_active FROM public.push_devices WHERE user_id = ?",
                Boolean.class, customer.id())).isFalse();
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.audit_logs WHERE action = 'account.deletion_requested'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void activeCasePreventsDeletionWithoutPartialChanges() {
        Actor customer = actor("customer");
        owner.update("""
                INSERT INTO public.rescue_requests(customer_id, service_code, idempotency_key,
                  vehicle_power_type, pickup_area_label, pickup_latitude, pickup_longitude,
                  pickup_source, pickup_accuracy_m, safety_acknowledged)
                VALUES (?, 'flat_tire', ?, 'gasoline', 'Test', 16.0544, 108.2022, 'gps', 20, TRUE)
                """, customer.id(), UUID.randomUUID());
        assertThatThrownBy(() -> accounts.requestDeletion(customer)).isInstanceOfSatisfying(ApiException.class,
                error -> assertThat(error.code()).isEqualTo("ACTIVE_REQUEST_EXISTS"));
        assertThat(owner.queryForObject("SELECT is_active AND deletion_requested_at IS NULL FROM public.profiles WHERE id = ?",
                Boolean.class, customer.id())).isTrue();
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.audit_logs", Integer.class)).isZero();
    }

    @Test
    void adminDeletionRequiresHandover() {
        assertThatThrownBy(() -> accounts.requestDeletion(actor("admin"))).isInstanceOfSatisfying(ApiException.class,
                error -> assertThat(error.code()).isEqualTo("ADMIN_DELETION_REQUIRES_HANDOVER"));
    }

    @Test
    void quotaIsIsolatedPerAccountAndCanReleaseFailedGeneration() {
        Actor first = actor("customer");
        Actor second = actor("customer");
        var quota = new AssistantQuotaService(runtime,
                new AssistantProperties(true, null, "test", null, 1, 2, 100));
        var reservation = transactions.execute(status -> quota.reserve(first.id()));
        assertThat(reservation.remainingToday()).isEqualTo(1);
        assertThatThrownBy(() -> transactions.execute(status -> quota.reserve(first.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("ASSISTANT_MINUTE_LIMIT"));
        assertThat(transactions.execute(status -> quota.reserve(second.id())).remainingToday()).isEqualTo(1);
        quota.release(reservation);
        assertThat(transactions.execute(status -> quota.reserve(first.id())).remainingToday()).isEqualTo(1);
    }

    @Test
    void quotaEnforcesRollingDayLimit() {
        Actor customer = actor("customer");
        owner.update("""
                INSERT INTO public.assistant_usage_events(user_id, created_at)
                VALUES (?, NOW() - INTERVAL '2 hours'), (?, NOW() - INTERVAL '3 hours')
                """, customer.id(), customer.id());
        var quota = new AssistantQuotaService(runtime,
                new AssistantProperties(true, null, "test", null, 1, 2, 100));
        assertThatThrownBy(() -> transactions.execute(status -> quota.reserve(customer.id())))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("ASSISTANT_DAILY_LIMIT"));
        assertThat(owner.queryForObject("SELECT COUNT(*) FROM public.assistant_usage_events", Integer.class)).isEqualTo(2);
    }

    private Actor actor(String role) {
        UUID id = UUID.randomUUID();
        owner.update("INSERT INTO auth.users(id) VALUES (?)", id);
        owner.update("UPDATE public.profiles SET role = ? WHERE id = ?", role, id);
        return new Actor(id, "Integration", role, "vi");
    }
}

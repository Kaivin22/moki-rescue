package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class ProviderPrivacyAndApprovalTest {
    private final Actor admin = new Actor(UUID.randomUUID(), "Admin", "admin", "vi");
    private final Actor provider = new Actor(UUID.randomUUID(), "Provider", "provider", "vi");
    private final List<String> events = new ArrayList<>();
    private int updatedRows = 1;
    private final JdbcTemplate jdbc = new JdbcTemplate() {
        @Override public <T> T query(String sql, ResultSetExtractor<T> extractor, Object... args) {
            assertThat(sql).contains("WHERE rr.assigned_provider_id = ?", "NOT review.is_hidden");
            assertThat(sql).doesNotContain("team_id = ?");
            assertThat(args).containsExactly(provider.id());
            ResultSet result = (ResultSet) Proxy.newProxyInstance(ResultSet.class.getClassLoader(), new Class<?>[] {ResultSet.class},
                    (proxy, method, values) -> switch (method.getName()) {
                        case "next" -> true;
                        case "getLong" -> "completed".equals(values[0]) ? 2L : 0L;
                        case "getInt" -> 0;
                        case "getBigDecimal" -> null;
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
            try { return extractor.extractData(result); } catch (SQLException e) { throw new IllegalStateException(e); }
        }
        @Override public int update(String sql, Object... args) {
            assertThat(sql).contains("pm.status = 'pending'", "profile.role = 'provider' AND profile.is_active");
            assertThat(args).containsExactly("active", provider.id(), "active");
            events.add("decision");
            return updatedRows;
        }
    };
    private final TransactionTemplate transactions = new TransactionTemplate() {
        @Override public <T> T execute(TransactionCallback<T> callback) {
            return callback.doInTransaction(new SimpleTransactionStatus());
        }
    };
    private final AuditService audit = new AuditService(jdbc) {
        @Override public void record(UUID actorId, String action, String entity, Object entityId) {
            assertThat(actorId).isEqualTo(admin.id());
            assertThat(action).isEqualTo("provider.review.active");
            events.add("audit");
        }
    };
    private OperatorService operator() { return new OperatorService(jdbc, null, audit, transactions, null); }

    @Test void personalStatisticsUseOnlyTheAuthenticatedProviderId() {
        var service = new ProviderService(jdbc, transactions, null, audit, null, null);
        assertThat(service.statistics(provider).completedCases()).isEqualTo(2);
        assertThatThrownBy(() -> service.statistics(admin)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PROVIDER_ROLE_REQUIRED"));
    }
    @Test void providersCannotReadTheDirectoryOrApproveThemselves() {
        assertThatThrownBy(() -> operator().providerDirectory(provider)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("ADMIN_ROLE_REQUIRED"));
        assertThatThrownBy(() -> operator().reviewProvider(provider, provider.id(), "active")).isInstanceOf(ApiException.class);
        assertThat(events).isEmpty();
    }
    @Test void successfulAdminDecisionIsAudited() {
        operator().reviewProvider(admin, provider.id(), "active");
        assertThat(events).containsExactly("decision", "audit");
    }
    @Test void staleDecisionCannotOverwriteAnAlreadyReviewedApplication() {
        updatedRows = 0;
        assertThatThrownBy(() -> operator().reviewProvider(admin, provider.id(), "active")).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PROVIDER_REVIEW_CHANGED"));
        assertThat(events).containsExactly("decision");
    }
}

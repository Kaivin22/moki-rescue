package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.model.ApiModels.CaseResolutionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/** Service branching tests with explicit test doubles; database behavior is covered separately. */
class OperatorCaseResolutionServiceTest {
    private final FakeJdbc jdbc = new FakeJdbc();
    private final UUID id = UUID.randomUUID();
    private final Actor admin = new Actor(UUID.randomUUID(), "Admin", "admin", "vi");
    private int notifications;
    private final OperatorCaseResolutionService service = new OperatorCaseResolutionService(jdbc,
            new TransactionTemplate() {
                @Override public <T> T execute(TransactionCallback<T> action) {
                    return action.doInTransaction(new SimpleTransactionStatus());
                }
            }, new RescueRequestAccess(jdbc) {
                @Override void setActor(UUID actorId) { assertThat(actorId).isEqualTo(admin.id()); }
            }, new RescueNotificationService(jdbc, null) {
                @Override void notifyParticipants(UUID requestId, NotificationKind kind, String detail) {
                    assertThat(requestId).isEqualTo(id);
                    assertThat(detail).isEqualTo("completed");
                    notifications++;
                }
            });

    @Test
    void unverifiedOnlyAppendsAuditDoesNotChangeStatusTimerProviderOrAlerts() {
        service.resolve(admin, id, input("unverified", 7));
        assertThat(jdbc.writes).hasSize(1);
        assertThat(jdbc.writes.getFirst()).contains("INSERT INTO public.audit_logs");
        assertThat(jdbc.args.getFirst()).contains(admin.id(), "unverified", "Evidence from contacting both parties", id);
        assertThat(notifications).isZero();
    }

    @Test
    void verifiedCompletesReleasesProviderClosesOnlyLifecycleFlagsAndNotifiesBothParties() {
        service.resolve(admin, id, input("verified_completed", 7));
        assertThat(jdbc.writes).hasSize(4);
        assertThat(jdbc.writes.get(0)).contains("status = 'completed'", "version = ?", "status = 'awaiting_completion'");
        assertThat(jdbc.writes.get(1)).contains("is_available = FALSE", "last_latitude = NULL", "assigned_provider_id");
        assertThat(jdbc.writes.get(2)).contains("completion_dispute").doesNotContain("customer_incident_reported", "customer_support_requested");
        assertThat(jdbc.writes.get(3)).contains("jsonb_build_object", "'requestVersion', version");
        assertThat(notifications).isEqualTo(1);
    }

    @Test
    void staleDecisionCannotWriteAnything() {
        assertThatThrownBy(() -> service.resolve(admin, id, input("verified_completed", 6)))
                .isInstanceOf(ApiException.class);
        assertThat(jdbc.writes).isEmpty();
        assertThat(notifications).isZero();
    }

    @Test
    void failedCompareAndSetDoesNotReleaseProviderOrRecordSuccessfulDecision() {
        jdbc.updateCount = 0;
        assertThatThrownBy(() -> service.resolve(admin, id, input("verified_completed", 7)))
                .isInstanceOf(ApiException.class);
        assertThat(jdbc.writes).hasSize(1);
        assertThat(notifications).isZero();
    }

    private CaseResolutionRequest input(String decision, int version) {
        return new CaseResolutionRequest(decision, "  Evidence from contacting both parties  ", version);
    }

    private static class FakeJdbc extends JdbcTemplate {
        final List<String> writes = new ArrayList<>();
        final List<Object[]> args = new ArrayList<>();
        int updateCount = 1;

        @Override public int update(String sql, Object... values) {
            writes.add(sql);
            args.add(values);
            return updateCount;
        }

        @Override public <T> T query(String sql, ResultSetExtractor<T> extractor, Object... values) {
            assertThat(sql).contains("FOR UPDATE");
            try (var rows = RowSetProvider.newFactory().createCachedRowSet()) {
                var metadata = new RowSetMetaDataImpl();
                metadata.setColumnCount(2);
                metadata.setColumnName(1, "status");
                metadata.setColumnType(1, Types.VARCHAR);
                metadata.setColumnName(2, "version");
                metadata.setColumnType(2, Types.INTEGER);
                rows.setMetaData(metadata);
                rows.moveToInsertRow();
                rows.updateString(1, "awaiting_completion");
                rows.updateInt(2, 7);
                rows.insertRow();
                rows.moveToCurrentRow();
                rows.beforeFirst();
                return extractor.extractData(rows);
            } catch (SQLException e) {
                throw new AssertionError(e);
            }
        }
    }
}

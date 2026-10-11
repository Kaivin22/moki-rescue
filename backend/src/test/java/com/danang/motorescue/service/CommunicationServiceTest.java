package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.CommunicationModels.*;
import com.danang.motorescue.web.ApiException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/** Unit contracts only. SQL execution and grants are covered separately by integration tests. */
class CommunicationServiceTest {
    private final Actor customer = actor("customer"), admin = actor("admin");
    private final RecordingJdbc jdbc = new RecordingJdbc();
    private final TransactionTemplate tx = new TransactionTemplate() {
        @Override public <T> T execute(TransactionCallback<T> action) { return action.doInTransaction(new SimpleTransactionStatus()); }
    };
    private final InboxService inbox = new InboxService(jdbc, tx, new AuditService(jdbc));
    private final SupportTicketService support = new SupportTicketService(jdbc, tx, new AuditService(jdbc),
            new OperatorService(jdbc, null, new AuditService(jdbc), tx, null));

    @ParameterizedTest @ValueSource(strings = {"customer", "provider"})
    void publishingAndChangingStatusesAreAdminOnly(String role) {
        Actor user = actor(role);
        assertThatThrownBy(() -> inbox.publish(user, new Publish(UUID.randomUUID(), "all", "Valid title", "Valid announcement content"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> inbox.preview(user, "all")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> inbox.announcements(user, null, null, 30)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> support.changeStatus(user, UUID.randomUUID(), new ChangeStatus(0L, "resolved", "Resolved note"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> support.reply(user, UUID.randomUUID(), new SendMessage(UUID.randomUUID(), "private", true))).isInstanceOf(ApiException.class);
        assertThat(jdbc.statements).isEmpty();
    }
    @Test void inboxQueriesAndMarkReadAlwaysBindCurrentOwner() {
        inbox.list(customer, true, null, null, 9999);
        assertThat(jdbc.sql).contains("t.user_id = ?", "t.read_at IS NULL", "ORDER BY t.created_at DESC, t.id DESC");
        assertThat(jdbc.args).containsExactly(customer.id(), true, 101);
        UUID id = UUID.randomUUID();
        inbox.read(customer, id);
        assertThat(jdbc.sql).contains("COALESCE(read_at, NOW())", "id = ? AND user_id = ?");
        assertThat(jdbc.args).containsExactly(id, customer.id());
    }
    @Test void partialCursorsAndInvalidAudienceAreRejected() {
        assertThatThrownBy(() -> inbox.list(customer, false, Instant.now(), null, 30)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> inbox.preview(admin, "all' OR true --")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> support.list(admin, "bad", null, null, 30)).isInstanceOf(ApiException.class);
        assertThat(jdbc.statements).isEmpty();
    }
    @Test void missingOrForeignTicketStopsBeforeReadingAnyMessages() {
        assertThatThrownBy(() -> support.messages(customer, UUID.randomUUID(), null, null, 30))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status().value()).isEqualTo(404));
        assertThat(jdbc.statements).hasSize(1);
        assertThat(jdbc.sql).contains("t.owner_id = ? OR ?");
        assertThat(jdbc.args[0]).isEqualTo(customer.id());
        assertThat(jdbc.args[1]).isEqualTo(false);
    }
    @Test void messagesExcludeInternalNotesForNonAdmins() {
        jdbc.ticket = ticket("open", 0);
        support.messages(customer, jdbc.ticket.id(), null, null, 30);
        assertThat(jdbc.sql).contains("NOT t.internal OR ?");
        assertThat(jdbc.args).containsExactly(jdbc.ticket.id(), false, 31);
        support.messages(admin, jdbc.ticket.id(), null, null, 30);
        assertThat(jdbc.args).containsExactly(jdbc.ticket.id(), true, 31);
    }
    @Test void closedTicketRejectsReplyWithoutWriting() {
        jdbc.ticket = ticket("resolved", 3);
        assertThatThrownBy(() -> support.reply(customer, jdbc.ticket.id(), new SendMessage(UUID.randomUUID(), "Hello", false)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("SUPPORT_CLOSED"));
        assertThat(jdbc.writes).isEmpty();
    }
    @Test void blankReplyRejectedWithoutQueries() {
        assertThatThrownBy(() -> support.reply(customer, UUID.randomUUID(), new SendMessage(UUID.randomUUID(), "  ", false))).isInstanceOf(ApiException.class);
        assertThat(jdbc.statements).isEmpty();
    }
    @Test void staleStatusCannotCloseANewerConversation() {
        jdbc.ticket = ticket("open", 4);
        assertThatThrownBy(() -> support.changeStatus(admin, jdbc.ticket.id(), new ChangeStatus(3L, "resolved", "All done")))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("COMMUNICATION_CHANGED"));
        assertThat(jdbc.writes).isEmpty();
    }
    @Test void duplicateReplyIsIdempotentAndDoesNotNotifyAgain() {
        jdbc.ticket = ticket("waiting_user", 1);
        UUID id = UUID.randomUUID();
        jdbc.message = new Message(id, admin.id(), "Admin", "admin", "Reply text", false, Instant.now());
        support.reply(admin, jdbc.ticket.id(), new SendMessage(id, "Reply text", false));
        assertThat(jdbc.writes).isEmpty();
        assertThatThrownBy(() -> support.reply(admin, jdbc.ticket.id(), new SendMessage(id, "Changed text", false))).isInstanceOf(ApiException.class);
    }
    @Test void privateNotesDoNotChangePublicStatusOrNotifyOwner() {
        jdbc.ticket = ticket("open", 0);
        support.reply(admin, jdbc.ticket.id(), new SendMessage(UUID.randomUUID(), "Internal only", true));
        assertThat(jdbc.writes).anyMatch(sql -> sql.contains("public.support_messages"));
        assertThat(jdbc.writes).noneMatch(sql -> sql.contains("public.user_notifications"));
        assertThat(jdbc.statusWritten).isEqualTo("open");
    }
    @Test void publicAdminReplyChangesQueueAndNotifiesOwner() {
        jdbc.ticket = ticket("open", 0);
        support.reply(admin, jdbc.ticket.id(), new SendMessage(UUID.randomUUID(), "Public response", false));
        assertThat(jdbc.statusWritten).isEqualTo("waiting_user");
        assertThat(jdbc.writes).anyMatch(sql -> sql.contains("public.user_notifications"));
    }
    @Test void customerReplyReturnsTicketToAdminQueue() {
        jdbc.ticket = ticket("waiting_user", 2);
        support.reply(customer, jdbc.ticket.id(), new SendMessage(UUID.randomUUID(), "Customer response", false));
        assertThat(jdbc.statusWritten).isEqualTo("open");
        assertThat(jdbc.writes).anyMatch(sql -> sql.contains("role = 'admin'"));
    }
    @Test void adminCannotCreateTicketOnBehalfOfUser() {
        assertThatThrownBy(() -> support.create(admin, new CreateTicket(UUID.randomUUID(), "Title", "Description"))).isInstanceOf(ApiException.class);
        assertThat(jdbc.statements).isEmpty();
    }
    @Test void rateLimitPreventsReplyWrites() {
        jdbc.ticket = ticket("open", 0); jdbc.count = 30;
        assertThatThrownBy(() -> support.reply(customer, jdbc.ticket.id(), new SendMessage(UUID.randomUUID(), "Hello", false)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status().value()).isEqualTo(429));
        assertThat(jdbc.writes).isEmpty();
    }
    private Actor actor(String role) { return new Actor(UUID.randomUUID(), role, role, "vi"); }
    private Ticket ticket(String status, long version) { return new Ticket(UUID.randomUUID(), customer.id(), "Customer", null, "Subject", "Description", status, version, Instant.now(), Instant.now()); }
    private static class RecordingJdbc extends JdbcTemplate {
        String sql; Object[] args; Ticket ticket; Message message; int count; String statusWritten;
        final List<String> statements = new ArrayList<>(), writes = new ArrayList<>();
        private void record(String sql, Object[] args) { this.sql = sql; this.args = args; statements.add(sql); }
        @Override @SuppressWarnings("unchecked") public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
            record(sql, args);
            if (sql.contains("public.support_tickets") && ticket != null) return (List<T>) List.of(ticket);
            if (sql.contains("t.author_id = ?") && message != null) return (List<T>) List.of(message);
            return List.of();
        }
        @Override @SuppressWarnings("unchecked") public <T> T queryForObject(String sql, Class<T> type, Object... args) {
            record(sql, args); return type == Integer.class ? (T) Integer.valueOf(count) : null;
        }
        @Override public int update(String sql, Object... args) {
            record(sql, args); writes.add(sql);
            if (sql.contains("SET status = ?")) statusWritten = (String) args[0];
            return 1;
        }
    }
}

package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.CommunicationModels.*;
import com.danang.motorescue.support.LocalPostgis;
import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Requires the project's dedicated native PostGIS fixture; never touches Supabase or Docker. */
class CommunicationIntegrationTest extends PostgisIntegrationTestSupport {
    @RegisterExtension static final LocalPostgis POSTGRES = newLocalPostgis();
    private static JdbcTemplate owner, runtime;
    private static InboxService inbox;
    private static SupportTicketService support;
    private Actor customer, stranger, provider, admin;
    @BeforeAll static void prepare() {
        flywayFor(POSTGRES).migrate();
        owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        var ds = runtimeDataSourceFor(POSTGRES);
        runtime = new JdbcTemplate(ds);
        var transactions = new TransactionTemplate(new DataSourceTransactionManager(ds));
        var audit = new AuditService(runtime);
        var operator = new OperatorService(runtime, null, audit, transactions, null);
        inbox = new InboxService(runtime, transactions, audit);
        support = new SupportTicketService(runtime, transactions, audit, operator);
    }
    @BeforeEach void actors() {
        // This is the randomly named, isolated disposable fixture, not an application database.
        owner.update("UPDATE public.profiles SET is_active = FALSE");
        customer = actor("customer"); stranger = actor("customer"); provider = actor("provider"); admin = actor("admin");
    }
    @Test void fullConversationHidesNotesAndNotifiesCorrectPeople() {
        var ticket = support.create(customer, new CreateTicket(UUID.randomUUID(), "Account issue", "I need help with my account"));
        assertThat(inbox.unread(admin).count()).isEqualTo(1);
        assertThatThrownBy(() -> support.detail(stranger, ticket.id())).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> support.messages(provider, ticket.id(), null, null, 30)).isInstanceOf(ApiException.class);
        support.reply(admin, ticket.id(), new SendMessage(UUID.randomUUID(), "Private investigation", true));
        assertThat(support.messages(customer, ticket.id(), null, null, 30).items()).isEmpty();
        assertThat(inbox.unread(customer).count()).isZero();
        assertThat(support.messages(admin, ticket.id(), null, null, 30).items()).hasSize(1);
        UUID reply = UUID.randomUUID();
        support.reply(admin, ticket.id(), new SendMessage(reply, "Can you clarify the issue?", false));
        support.reply(admin, ticket.id(), new SendMessage(reply, "Can you clarify the issue?", false));
        assertThat(support.messages(customer, ticket.id(), null, null, 30).items()).hasSize(1);
        assertThat(support.detail(customer, ticket.id()).status()).isEqualTo("waiting_user");
        assertThat(inbox.unread(customer).count()).isEqualTo(1);
        support.reply(customer, ticket.id(), new SendMessage(UUID.randomUUID(), "Here is more information", false));
        assertThat(support.detail(customer, ticket.id()).status()).isEqualTo("open");
        var current = support.detail(admin, ticket.id());
        assertThatThrownBy(() -> support.changeStatus(admin, ticket.id(), new ChangeStatus(0L, "resolved", "Checked and resolved"))).isInstanceOf(ApiException.class);
        support.changeStatus(admin, ticket.id(), new ChangeStatus(current.version(), "resolved", "Checked and resolved"));
        assertThat(support.detail(customer, ticket.id()).status()).isEqualTo("resolved");
        assertThatThrownBy(() -> support.reply(customer, ticket.id(), new SendMessage(UUID.randomUUID(), "Late reply", false))).isInstanceOf(ApiException.class);
        assertThat(support.messages(customer, ticket.id(), null, null, 30).items()).hasSize(3);
    }
    @Test void broadcastsAreRoleScopedAtomicAndIdempotent() {
        var input = new Publish(UUID.randomUUID(), "provider", "Service update", "Notice for providers only");
        assertThat(inbox.preview(admin, "provider").count()).isEqualTo(1);
        assertThat(inbox.publish(admin, input).recipientCount()).isEqualTo(1);
        inbox.publish(admin, input);
        assertThat(inbox.list(provider, false, null, null, 30).items()).hasSize(1);
        assertThat(inbox.list(customer, false, null, null, 30).items()).isEmpty();
        assertThatThrownBy(() -> inbox.publish(customer, input)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> inbox.publish(admin, new Publish(input.id(), "all", input.title(), input.body()))).isInstanceOf(ApiException.class);
        assertThat(inbox.publish(admin, new Publish(UUID.randomUUID(), "all", "System update", "Notice to all active accounts")).recipientCount()).isEqualTo(4);
    }
    @Test void readStateIsPrivateAndCursorDoesNotSkipEqualTimestamps() {
        for (int index = 0; index < 4; index++) inbox.publish(admin, new Publish(UUID.randomUUID(), "customer", "Notice " + index, "Notification body " + index));
        owner.update("UPDATE public.user_notifications SET created_at = '2026-10-08T00:00:00Z' WHERE user_id = ?", customer.id());
        var first = inbox.list(customer, true, null, null, 2);
        var second = inbox.list(customer, true, first.nextBefore(), first.nextBeforeId(), 2);
        assertThat(first.items()).hasSize(2); assertThat(second.items()).hasSize(2);
        assertThat(first.items()).extracting(Notification::id).doesNotContainAnyElementsOf(second.items().stream().map(Notification::id).toList());
        UUID id = first.items().get(0).id();
        assertThatThrownBy(() -> inbox.read(stranger, id)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> inbox.detail(admin, id)).isInstanceOf(ApiException.class);
        inbox.read(customer, id); var readAt = inbox.detail(customer, id).readAt();
        inbox.read(customer, id);
        assertThat(inbox.detail(customer, id).readAt()).isEqualTo(readAt);
        assertThat(inbox.unread(customer).count()).isEqualTo(3);
    }
    @Test void createRetryAndOpenTicketLimitDoNotProduceDuplicates() {
        UUID id = UUID.randomUUID();
        var input = new CreateTicket(id, "Account issue", "Please check my account");
        support.create(provider, input); support.create(provider, input);
        assertThat(support.list(provider, "all", null, null, 30).items()).hasSize(1);
        assertThatThrownBy(() -> support.create(provider, new CreateTicket(id, "Other subject", input.description()))).isInstanceOf(ApiException.class);
        for (int index = 1; index < 10; index++) support.create(provider, new CreateTicket(UUID.randomUUID(), "Issue " + index, "Please investigate this issue"));
        assertThatThrownBy(() -> support.create(provider, new CreateTicket(UUID.randomUUID(), "Too many", "Please investigate this issue")))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.status().value()).isEqualTo(429));
    }
    @Test void directClientAccessHasNoPrivilegesAndRuntimeCanUseTables() {
        for (String table : new String[]{"user_notifications", "support_tickets", "support_messages", "announcements"}) {
            assertThat(owner.queryForObject("SELECT has_table_privilege('authenticated', ?, 'SELECT')", Boolean.class, "public." + table)).isFalse();
            assertThat(owner.queryForObject("SELECT has_table_privilege('anon', ?, 'INSERT')", Boolean.class, "public." + table)).isFalse();
            assertThat(runtime.queryForObject("SELECT COUNT(*) FROM public." + table, Integer.class)).isNotNull();
        }
    }
    private Actor actor(String role) {
        UUID id = UUID.randomUUID();
        owner.update("INSERT INTO auth.users(id) VALUES (?)", id);
        owner.update("UPDATE public.profiles SET role = ?, display_name = ? WHERE id = ?", role, role, id);
        return new Actor(id, role, role, "vi");
    }
}

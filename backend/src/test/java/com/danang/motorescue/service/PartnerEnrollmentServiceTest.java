package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.PartnerEnrollmentModels.*;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

/** Authorization/branch unit tests; database execution and constraints require integration tests. */
class PartnerEnrollmentServiceTest {
    private final Actor actor = new Actor(UUID.randomUUID(), "Test representative", "customer", "vi");
    private final UUID team = UUID.randomUUID(), member = UUID.randomUUID();
    private final StubJdbc jdbc = new StubJdbc();
    private final TransactionTemplate tx = new TransactionTemplate() {
        @Override public <T> T execute(TransactionCallback<T> action) { return action.doInTransaction(new SimpleTransactionStatus()); }
    };
    private final PartnerEnrollmentService service = new PartnerEnrollmentService(jdbc, tx, new AuditService(jdbc));

    @Test void customersCannotApproveApplicationsOrReadVerificationChecks() {
        assertStatus(403, () -> service.review(actor, UUID.randomUUID(), new Review("approved", "Valid note", List.of())));
        assertStatus(403, () -> service.checks(actor));
        assertThat(jdbc.reads).isZero();
        assertThat(jdbc.writes).isZero();
    }
    @Test void outsidersCannotReadMembersOrInvitationsOrMutateTheRoster() {
        assertStatus(403, () -> service.members(actor, team));
        assertStatus(403, () -> service.sent(actor, team));
        assertStatus(403, () -> service.invite(actor, team, new Invite("+84912345678", true)));
        assertStatus(403, () -> service.remove(actor, team, member));
        assertStatus(403, () -> service.revoke(actor, team, UUID.randomUUID()));
        assertThat(jdbc.writes).isZero();
    }
    @Test void suspendedShopsCannotInviteOrRemoveEvenWithRepresentativeAuthority() {
        jdbc.teamStatus = "suspended";
        assertStatus(409, () -> service.invite(actor, team, new Invite("+84912345678", true)));
        assertStatus(409, () -> service.remove(actor, team, member));
        assertThat(jdbc.writes).isZero();
    }
    @Test void representativesCannotRemoveThemselvesOrClearAdminSuspensions() {
        jdbc.teamStatus = "verified";
        assertStatus(409, () -> service.remove(actor, team, actor.id()));
        jdbc.memberStatus = "suspended";
        assertStatus(409, () -> service.remove(actor, team, member));
        assertThat(jdbc.writes).isZero();
    }
    @Test void anOpenJobPreventsRemovalBeforeAnyMembershipOrRoleChange() {
        jdbc.teamStatus = "verified"; jdbc.memberStatus = "active"; jdbc.openJob = true;
        assertStatus(409, () -> service.remove(actor, team, member));
        assertThat(jdbc.writes).isZero();
    }
    @Test void anOutstandingDispatchOfferAlsoPreventsRemoval() {
        jdbc.teamStatus = "verified"; jdbc.memberStatus = "active"; jdbc.openOffer = true;
        assertStatus(409, () -> service.remove(actor, team, member));
        assertThat(jdbc.writes).isZero();
    }
    @Test void recipientCannotAnswerAnInvitationAddressedToSomeoneElse() {
        assertStatus(404, () -> service.answer(actor, UUID.randomUUID(), "accepted"));
        assertThat(jdbc.writes).isZero();
    }
    @Test void missingRosterConfirmationStopsBeforePhoneLookup() {
        jdbc.teamStatus = "verified";
        assertStatus(409, () -> service.invite(actor, team, new Invite("+84912345678", false)));
        assertThat(jdbc.reads).isEqualTo(1);
        assertThat(jdbc.writes).isZero();
    }
    private static void assertStatus(int expected, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class,
                error -> assertThat(error.status().value()).isEqualTo(expected));
    }
    private static class StubJdbc extends JdbcTemplate {
        String teamStatus, memberStatus;
        boolean openJob, openOffer;
        int reads, writes;
        @Override @SuppressWarnings("unchecked")
        public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
            reads++;
            if (sql.contains("JOIN public.team_representatives")) return teamStatus == null ? List.of() : (List<T>) List.of(teamStatus);
            if (sql.startsWith("SELECT id FROM public.profiles")) return (List<T>) List.of(args[0]);
            if (sql.startsWith("SELECT status FROM public.provider_members")) return memberStatus == null ? List.of() : (List<T>) List.of(memberStatus);
            return List.of();
        }
        @Override @SuppressWarnings("unchecked")
        public <T> T queryForObject(String sql, Class<T> type, Object... args) {
            reads++;
            if (sql.contains("pg_advisory_xact_lock")) return null;
            if (sql.contains("public.rescue_requests")) return (T) Boolean.valueOf(openJob);
            if (sql.contains("public.dispatch_offers")) return (T) Boolean.valueOf(openOffer);
            throw new AssertionError("Unexpected SQL in branch test: " + sql);
        }
        @Override public int update(String sql, Object... args) { writes++; return 1; }
    }
}

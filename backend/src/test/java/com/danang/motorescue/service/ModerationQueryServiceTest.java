package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.service.ModerationQueryService.Entry;
import com.danang.motorescue.web.ApiException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class ModerationQueryServiceTest {
    private final ActorService.Actor admin = new ActorService.Actor(UUID.randomUUID(), "Admin", "admin", "vi");
    private final RecordingJdbc jdbc = new RecordingJdbc();
    private final ModerationQueryService service = new ModerationQueryService(jdbc);

    @ParameterizedTest
    @ValueSource(strings = {"customer", "provider"})
    void preventsOtherRolesFromListingAndReading(String role) {
        var actor = new ActorService.Actor(UUID.randomUUID(), "User", role, "vi");
        assertThatThrownBy(() -> service.list(actor, "incidents", "all", null, null, 30))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ADMIN_ROLE_REQUIRED"));
        assertThatThrownBy(() -> service.detail(actor, "reviews", UUID.randomUUID())).isInstanceOf(ApiException.class);
        assertThat(jdbc.sql).isNull();
    }

    @Test
    void rejectsInvalidKindsFiltersAndPartialCursorsBeforeQuerying() {
        assertThatThrownBy(() -> service.list(admin, "reviews; DROP TABLE", "all", null, null, 30)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.list(admin, "reviews", "open", null, null, 30)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.list(admin, "reviews", "all", Instant.now(), null, 30)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.list(admin, "reviews", "all", null, UUID.randomUUID(), 30)).isInstanceOf(ApiException.class);
        assertThat(jdbc.sql).isNull();
    }

    @Test
    void usesStableBoundedPaginationAndReturnsOnlyRequestedRows() {
        var time = Instant.parse("2026-01-01T00:00:00Z");
        Entry a = entry(time), b = entry(time.minusSeconds(1)), c = entry(time.minusSeconds(2));
        jdbc.rows = List.of(a, b, c);
        var page = service.list(admin, "incidents", "open", time, a.id(), 2);
        assertThat(page.items()).containsExactly(a, b);
        assertThat(page.nextBefore()).isEqualTo(b.createdAt());
        assertThat(page.nextBeforeId()).isEqualTo(b.id());
        assertThat(jdbc.sql).contains("public.incident_reports", "status = ?", "(created_at, id) < (?, ?)", "ORDER BY created_at DESC, id DESC LIMIT ?");
        assertThat(jdbc.parameters).containsExactly("open", Timestamp.from(time), a.id(), 3);
    }

    @Test
    void emptyOrFinalPagesHaveNoNextCursorAndLimitIsClamped() {
        var page = service.list(admin, "reviews", "hidden", null, null, 100000);
        assertThat(page.items()).isEmpty();
        assertThat(page.nextBefore()).isNull();
        assertThat(page.nextBeforeId()).isNull();
        assertThat(jdbc.parameters).containsExactly("hidden", 101);
        service.list(admin, "quality-alerts", "warned", null, null, -1);
        assertThat(jdbc.parameters).containsExactly("warned", 2);
        assertThat(jdbc.sql).contains("public.team_quality_alerts");
    }

    @Test
    void missingDetailIs404AndExistingDetailIsReturned() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> service.detail(admin, "reviews", id))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status().value()).isEqualTo(404));
        Entry entry = entry(Instant.now());
        jdbc.rows = List.of(entry);
        assertThat(service.detail(admin, "reviews", entry.id())).isEqualTo(entry);
        assertThat(jdbc.parameters).containsExactly(entry.id());
    }

    private Entry entry(Instant time) {
        return new Entry(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "Team", "safety", "Report",
                "open", null, null, null, time);
    }

    private static class RecordingJdbc extends JdbcTemplate {
        String sql;
        Object[] parameters;
        List<Entry> rows = List.of();
        @Override @SuppressWarnings("unchecked")
        public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
            this.sql = sql;
            this.parameters = args;
            return (List<T>) rows;
        }
    }
}

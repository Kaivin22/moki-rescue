package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;

class PersonalHistoryServiceTest {
    private final RecordingJdbc jdbc = new RecordingJdbc();
    private final PersonalHistoryService service = new PersonalHistoryService(jdbc);
    @ParameterizedTest @CsvSource({"customer,customer_id", "provider,assigned_provider_id"})
    void hidesOnlyOwnedClosedCasesAcrossAllPages(String role, String column) {
        Actor user = new Actor(UUID.randomUUID(), "User", role, "vi");
        service.hide(user, null);
        assertThat(jdbc.sql).contains("WHERE " + column + " = ?", "status IN ('completed', 'cancelled')", "ON CONFLICT DO NOTHING")
                .doesNotContain("DELETE", "LIMIT");
        assertThat(jdbc.args).containsExactly(user.id(), user.id(), null, null);
    }
    @Test void rejectsActiveOrForeignCaseButRepeatedHideIsIdempotent() {
        Actor user = new Actor(UUID.randomUUID(), "User", "customer", "vi");
        UUID id = UUID.randomUUID();
        jdbc.changed = 0;
        assertThatThrownBy(() -> service.hide(user,id)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.status().value()).isEqualTo(404));
        assertThat(jdbc.args).containsExactly(user.id(),id);
        jdbc.hidden = true;
        assertThatCode(() -> service.hide(user,id)).doesNotThrowAnyException();
    }
    @Test void adminCannotHideOperationalHistory() {
        assertThatThrownBy(() -> service.hide(new Actor(UUID.randomUUID(),"Admin","admin","vi"),null)).isInstanceOf(ApiException.class);
        assertThat(jdbc.sql).isNull();
    }
    private static class RecordingJdbc extends JdbcTemplate {
        String sql; Object[] args; int changed=1; boolean hidden;
        @Override public int update(String sql,Object...args) { this.sql=sql;this.args=args;return changed; }
        @Override public <T>T queryForObject(String sql,Class<T> type,Object...args) {
            this.sql=sql;this.args=args;return type.cast(hidden);
        }
    }
}

package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.danang.motorescue.service.ActorService.Actor;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;

class RescueContactTest {
    @Test void customerContactIsRestrictedToAssignedProviderAndAdminOnActiveCases() {
        UUID requestId = UUID.randomUUID(), providerId = UUID.randomUUID();
        for (String role : List.of("customer", "provider", "admin")) {
            for (String status : List.of("searching", "offered", "assigned", "en_route", "awaiting_quote",
                    "completed", "cancelled", "needs_dispatch")) {
                for (boolean assigned : List.of(true, false)) {
                    UUID actorId = assigned ? providerId : UUID.randomUUID();
                    var row = row(providerId, status);
                    var actor = new Actor(actorId, "Demo", role, "vi");
                    var access = new RescueRequestAccess(null) {
                        @Override RescueRequestData findForDetails(Actor actual, UUID id) {
                            assertThat(actual).isEqualTo(actor);
                            assertThat(id).isEqualTo(requestId);
                            return row;
                        }
                    };
                    boolean allowed = List.of("assigned", "en_route", "awaiting_quote").contains(status)
                            && (role.equals("admin") || (role.equals("provider") && assigned));
                    int[] lookups = {0};
                    var jdbc = new JdbcTemplate() {
                        @Override public <T> T query(String sql, ResultSetExtractor<T> extractor, Object... args) {
                            return null;
                        }
                        @Override public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
                            return List.of();
                        }
                        @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
                            if (sql.contains("api_customer_case_phone")) {
                                lookups[0]++;
                                assertThat(args).containsExactly(requestId, actorId);
                                return type.cast("+12025550190");
                            }
                            return null;
                        }
                    };
                    var service = new RescueQueryService(jdbc, null, null, null, access);
                    assertThat(service.details(actor, requestId).customerContactPhone())
                            .as("%s %s assigned=%s", role, status, assigned)
                            .isEqualTo(allowed ? "+12025550190" : null);
                    assertThat(lookups[0]).isEqualTo(allowed ? 1 : 0);
                }
            }
        }
    }

    private RescueRequestData row(UUID providerId, String status) {
        return new RescueRequestData(
                null, null, status, null, null, null, false, false, null, null, null, null, null, 0, 0, null, null, null, null, providerId, null, null, null, null, null, null, null, null, null, null, null, false, null, 0, null, null);
    }
}

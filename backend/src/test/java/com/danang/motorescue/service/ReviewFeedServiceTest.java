package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.*;
import com.danang.motorescue.service.ActorService.Actor;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class ReviewFeedServiceTest {
    @Test void refusesUnknownRoleBeforeAccessingReviews() {
        var service=new ReviewFeedService(new JdbcTemplate());
        assertThatThrownBy(() -> service.list(new Actor(UUID.randomUUID(), "Unknown", "unknown", "vi"), 0))
                .isInstanceOf(com.danang.motorescue.web.ApiException.class);
    }
    @Test void eachFeedBindsAuthenticatedIdentityAndRoleRatherThanClientSuppliedFilters() {
        for (String role:List.of("customer","provider","admin")) {
            UUID user=UUID.randomUUID();
            var jdbc=new JdbcTemplate() {
                @Override public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
                    assertThat(args).containsExactly(role,role,role,user,role,user,user,0);
                    assertThat(sql).contains("NOT r.is_hidden", "r.provider_id = ?", "mine.customer_id = ?");
                    return List.of();
                }
            };
            assertThat(new ReviewFeedService(jdbc).list(new Actor(user,"User",role,"vi"),-1).items()).isEmpty();
        }
    }
}

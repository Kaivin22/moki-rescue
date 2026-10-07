package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ServiceAreaServiceTest {
    @Test
    void usesSharedDatabasePolicyWithLatitudeThenLongitude() {
        var jdbc = new JdbcTemplate() {
            @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
                assertThat(sql).contains("public.api_is_in_service_area(?, ?)");
                assertThat(args).containsExactly(16.06, 108.22);
                return type.cast(Boolean.TRUE);
            }
        };
        assertThat(new ServiceAreaService(jdbc).contains(16.06, 108.22)).isTrue();
    }

    @Test
    void rejectsNonFiniteCoordinatesWithoutDatabaseAccess() {
        var service = new ServiceAreaService(new JdbcTemplate());
        assertThat(service.contains(Double.NaN, 108.22)).isFalse();
        assertThat(service.contains(16.06, Double.POSITIVE_INFINITY)).isFalse();
        assertThat(service.contains(Double.NEGATIVE_INFINITY, 108.22)).isFalse();
    }

    @Test
    void treatsNullDatabaseAnswerAsOutside() {
        var jdbc = new JdbcTemplate() {
            @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) { return null; }
        };
        assertThat(new ServiceAreaService(jdbc).contains(16.06, 108.22)).isFalse();
    }
}

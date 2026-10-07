package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;

class OperatorStatisticsServiceTest {
    @ParameterizedTest
    @ValueSource(strings = {"customer", "provider"})
    void rejectsOtherRolesBeforeReadingStatistics(String role) {
        // No DataSource: any accidental read before the role guard also fails this test.
        var jdbc = new JdbcTemplate();
        var service = new OperatorStatisticsService(jdbc);
        var actor = new ActorService.Actor(UUID.randomUUID(), "Test", role, "vi");
        assertThatThrownBy(() -> service.statistics(actor)).isInstanceOf(ApiException.class);
    }
}

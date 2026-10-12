package com.danang.motorescue.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

class HealthControllerTest {
    private final SchemaStub jdbc = new SchemaStub();
    private final HealthController controller = new HealthController(jdbc);

    @Test
    void completeSchemaIsReady() {
        jdbc.result = 1;
        var response = controller.readiness();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().status()).isEqualTo("ready");
    }

    @Test
    void incompleteSchemaIsNotReady() {
        jdbc.result = 0;
        var response = controller.readiness();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody().status()).isEqualTo("not_ready");
    }

    @Test
    void databaseFailureDoesNotLeakConnectionDetails() {
        jdbc.failure = true;
        var response = controller.readiness();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody().status()).isEqualTo("not_ready");
    }

    private static final class SchemaStub extends JdbcTemplate {
        private int result;
        private boolean failure;

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType) {
            if (failure) throw new DataAccessResourceFailureException("private connection details");
            return requiredType.cast(result);
        }
    }
}

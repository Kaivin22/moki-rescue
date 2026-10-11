package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.TeamLocationRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import jakarta.validation.Validation;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShopLocationValidationTest {
    @Test void addressAndCoordinatesAreBothRequired() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertThat(validator.validate(new TeamLocationRequest(16.061, 108.2238, "12 Example Street, Da Nang"))).isEmpty();
            assertThat(validator.validate(new TeamLocationRequest(16.061, 108.2238, ""))).isNotEmpty();
            assertThat(validator.validate(new TeamLocationRequest(null, 108.2238, "12 Example Street, Da Nang"))).isNotEmpty();
        }
    }

    @Test void rejectsAnAddressThatIsOnlyLongEnoughBeforeTrimming() {
        var jdbc = new JdbcTemplate() {
            @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
                throw new AssertionError("Invalid addresses must be rejected before querying the database");
            }
        };
        var operator = new OperatorService(jdbc, null, null, null, null);
        var admin = new Actor(UUID.randomUUID(), "Test admin", "admin", "vi");
        assertThatThrownBy(() -> operator.setTeamLocation(admin, UUID.randomUUID(), new TeamLocationRequest(16.061, 108.2238, "  x  ")))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("INVALID_SHOP_ADDRESS"));
    }
}

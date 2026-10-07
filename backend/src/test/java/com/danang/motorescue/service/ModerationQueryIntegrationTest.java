package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.support.LocalPostgis;
import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;

/** Executes each read query against migrated PostgreSQL using the actual API-role grants. */
class ModerationQueryIntegrationTest extends PostgisIntegrationTestSupport {
    @RegisterExtension static final LocalPostgis POSTGRES = newLocalPostgis();
    private static ModerationQueryService service;
    @BeforeAll static void prepare() {
        flywayFor(POSTGRES).migrate();
        service = new ModerationQueryService(new JdbcTemplate(runtimeDataSourceFor(POSTGRES)));
    }
    @ParameterizedTest @ValueSource(strings = {"reviews", "incidents", "quality-alerts"})
    void queriesUseValidSchemaAndRuntimePermissions(String kind) {
        var admin = new ActorService.Actor(UUID.randomUUID(), "Admin", "admin", "vi");
        var page = service.list(admin, kind, "all", null, null, 30);
        assertThat(page.items()).isEmpty();
        assertThat(page.nextBefore()).isNull();
        assertThatThrownBy(() -> service.detail(admin, kind, UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("MODERATION_NOT_FOUND"));
    }
}

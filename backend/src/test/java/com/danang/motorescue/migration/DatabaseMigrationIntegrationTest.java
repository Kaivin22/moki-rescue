package com.danang.motorescue.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class DatabaseMigrationIntegrationTest extends PostgisIntegrationTestSupport {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES = newPostgisContainer();

    @Test
    void cleanPostgisDatabaseMigratesAndRemainsIdempotent() throws SQLException {
        Flyway flyway = flywayFor(POSTGRES);

        MigrateResult firstRun = flyway.migrate();

        assertTrue(firstRun.success);
        assertEquals(2, firstRun.migrationsExecuted);
        assertTrue(flyway.validateWithResult().validationSuccessful);
        assertEquals(0, flyway.migrate().migrationsExecuted);

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            assertEquals(23, queryForInt(connection,
                    "SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                            + "AND table_name <> 'flyway_schema_history'"));
            assertEquals(23, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                            + "WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity"));
            assertEquals(6, queryForInt(connection, "SELECT COUNT(*) FROM public.service_types"));
            assertEquals(6, queryForInt(connection,
                    "SELECT COUNT(*) FROM public.team_verification_requirements"));
            assertEquals(1, queryForInt(connection, "SELECT COUNT(*) FROM public.service_zones"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace "
                            + "WHERE e.extname = 'postgis' AND n.nspname = 'extensions'"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_trigger "
                            + "WHERE tgname = 'rescue_requests_enforce_state_machine' AND NOT tgisinternal"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_policies "
                            + "WHERE schemaname = 'realtime' AND policyname = 'motorescue_realtime_read'"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_roles WHERE rolname = 'motorescue_api' "
                            + "AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND rolbypassrls"));
        }
    }

    private int queryForInt(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}

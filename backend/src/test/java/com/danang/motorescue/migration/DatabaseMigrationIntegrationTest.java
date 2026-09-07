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
import org.flywaydb.core.api.MigrationVersion;
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
    void cleanPostgisDatabaseMigratesLegacyDispatcherAndRemainsIdempotent() throws SQLException {
        Flyway beforeRoleMerge = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .cleanDisabled(true)
                .validateMigrationNaming(true)
                .target(MigrationVersion.fromVersion("4"))
                .load();

        MigrateResult initialMigrations = beforeRoleMerge.migrate();
        assertTrue(initialMigrations.success);
        assertEquals(4, initialMigrations.migrationsExecuted);

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO auth.users(id, phone)
                    VALUES ('00000000-0000-0000-0000-000000000001', '+84901234567')
                    """);
            statement.executeUpdate("""
                    UPDATE public.profiles SET role = 'dispatcher'
                    WHERE id = '00000000-0000-0000-0000-000000000001'
                    """);
        }

        Flyway flyway = flywayFor(POSTGRES);
        MigrateResult roleMerge = flyway.migrate();

        assertTrue(roleMerge.success);
        assertEquals(1, roleMerge.migrationsExecuted);
        assertTrue(flyway.validateWithResult().validationSuccessful);
        assertEquals(0, flyway.migrate().migrationsExecuted);

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            assertEquals(25, queryForInt(connection,
                    "SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                            + "AND table_name <> 'flyway_schema_history'"));
            assertEquals(25, queryForInt(connection,
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
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM public.profiles WHERE role = 'admin' "
                            + "AND id = '00000000-0000-0000-0000-000000000001'"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_constraint "
                            + "WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check' "
                            + "AND pg_get_constraintdef(oid) NOT LIKE '%dispatcher%'"));
        }
    }

    private int queryForInt(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }
}

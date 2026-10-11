package com.danang.motorescue.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import com.danang.motorescue.support.LocalPostgis;
import org.junit.jupiter.api.extension.RegisterExtension;

class DatabaseMigrationIntegrationTest extends PostgisIntegrationTestSupport {

    @RegisterExtension
    static final LocalPostgis POSTGRES = newLocalPostgis();

    @Test
    void cleanPostgisDatabaseAppliesVersionedMigrationsAndRemainsIdempotent() throws Exception {
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
        MigrateResult remainingMigrations = flyway.migrate();

        assertTrue(remainingMigrations.success);
        assertEquals(9, remainingMigrations.migrationsExecuted); // V5 through V13
        assertEquals(MigrationVersion.fromVersion("13"), flyway.info().current().getVersion());
        assertTrue(flyway.validateWithResult().validationSuccessful);
        assertEquals(0, flyway.migrate().migrationsExecuted);

        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            String bundle = Files.readString(
                    Path.of(System.getProperty("user.dir"), "..", "scripts", "01_init_database.sql").normalize())
                    .replace("\r\n", "\n");
            String startMarker = "-- BEGIN SCHEMA VERIFICATION\n";
            int start = bundle.indexOf(startMarker);
            int end = bundle.indexOf("-- END SCHEMA VERIFICATION", start);
            assertTrue(start >= 0 && end > start, "Missing bundled security checks");
            String verificationSql = "BEGIN TRANSACTION READ ONLY;\n"
                    + bundle.substring(start + startMarker.length(), end) + "\nCOMMIT;";
            try (Statement verification = connection.createStatement()) {
                verification.execute(verificationSql);
            }
            assertEquals(30, queryForInt(connection,
                    "SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                            + "AND table_name <> 'flyway_schema_history'"));
            assertEquals(30, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                            + "WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity"));
            assertEquals(6, queryForInt(connection, "SELECT COUNT(*) FROM public.service_types"));
            assertEquals(6, queryForInt(connection,
                    "SELECT COUNT(*) FROM public.service_types WHERE matching_eta_window_seconds > 0 "
                            + "AND matching_starvation_skip_threshold > 0"));
            assertEquals(6, queryForInt(connection,
                    "SELECT COUNT(*) FROM public.team_verification_requirements"));
            assertEquals(1, queryForInt(connection, "SELECT COUNT(*) FROM public.service_zones"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM public.service_zones WHERE name = 'Da Nang launch zone' "
                            + "AND extensions.ST_Equals(boundary::extensions.geometry, "
                            + "extensions.ST_MakeEnvelope(108.05, 15.95, 108.34, 16.18, 4326))"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) WHERE public.api_is_in_service_area(16.0544, 108.2022) "
                            + "AND public.api_is_in_service_area(15.95, 108.05) "
                            + "AND NOT public.api_is_in_service_area(16.20, 108.2022)"));
            assertEquals(1, queryForInt(connection,
                    "SELECT COUNT(*) FROM pg_trigger "
                            + "WHERE tgname = 'rescue_requests_service_area' AND NOT tgisinternal"));
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

package com.danang.motorescue.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.danang.motorescue.support.LocalPostgis;
import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Executes the SQL Editor artifact, not just its constituent Flyway migrations. */
class CleanInstallBundleIntegrationTest extends PostgisIntegrationTestSupport {
    private static String bundle() throws Exception {
        return Files.readString(Path.of(System.getProperty("user.dir"), "..", "scripts",
                "01_init_database.sql").normalize()).replace("\r\n", "\n");
    }

    private static String script(String name) throws Exception {
        return Files.readString(Path.of(System.getProperty("user.dir"), "..", "scripts", name)
                .normalize()).replace("\r\n", "\n");
    }

    @Test
    void resetAndReinstallPreservesAuthAndSeedIsGuardedAndRepeatable() throws Exception {
        LocalPostgis postgres = newLocalPostgis();
        try {
            postgres.start();
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                    var statement = connection.createStatement()) {
                statement.execute(bundle());
                statement.execute("INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000099')");
                String seed = script("02_seed_demo_teams.sql");
                SQLException guardedSeed = assertThrows(SQLException.class, () -> statement.execute(seed));
                assertTrue(guardedSeed.getMessage().contains("DEMO_SEED_ENVIRONMENT_NOT_CONFIRMED"));
                statement.execute("ROLLBACK");
                String confirmedSeed = seed.replace("deployment_environment CONSTANT TEXT := 'CHANGE_ME'",
                        "deployment_environment CONSTANT TEXT := 'staging'");
                statement.execute(confirmedSeed);
                statement.execute("UPDATE public.rescue_teams SET base_address = 'Edited demo address' "
                        + "WHERE partner_reference = 'DEMO-DN-01'");
                statement.execute(confirmedSeed);
                assertEquals(12, count(connection, "SELECT count(*) FROM public.rescue_teams WHERE status = 'pending'"));
                assertEquals(1, count(connection, "SELECT count(*) FROM public.rescue_teams WHERE base_address = 'Edited demo address'"));
                assertEquals(36, count(connection, "SELECT count(*) FROM public.team_capabilities"));
                assertEquals(0, count(connection, "SELECT count(*) FROM public.provider_members"));
                assertEquals(0, count(connection, "SELECT count(*) FROM public.team_capabilities WHERE service_code = 'electric_battery'"));

                String reset = script("optional/00_reset.sql");
                SQLException guardedReset = assertThrows(SQLException.class, () -> statement.execute(reset));
                assertTrue(guardedReset.getMessage().contains("RESET_NOT_CONFIRMED"));
                statement.execute("ROLLBACK");
                assertEquals(30, publicTableCount(connection));
                // Only this fixture's randomly named database, never Supabase or app credentials.
                statement.execute(reset.replace("confirm_reset CONSTANT TEXT := 'CHANGE_ME'",
                                "confirm_reset CONSTANT TEXT := 'RESET_MOTORESCUE'")
                        .replace("deployment_environment CONSTANT TEXT := 'CHANGE_ME'",
                                "deployment_environment CONSTANT TEXT := 'staging'"));
                assertEquals(0, publicTableCount(connection));
                assertEquals(1, count(connection, "SELECT count(*) FROM auth.users"));
                statement.execute(bundle());
                assertEquals(30, publicTableCount(connection));
                assertEquals(1, count(connection, "SELECT count(*) FROM public.profiles WHERE role = 'customer'"));
                assertEquals(0, count(connection, "SELECT count(*) FROM public.rescue_teams"));
                statement.execute(confirmedSeed);
                assertEquals(12, count(connection, "SELECT count(*) FROM public.rescue_teams"));
            }
        } finally {
            postgres.afterAll(null);
        }
    }

    private static int count(Connection connection, String query) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(query)) {
            rows.next();
            return rows.getInt(1);
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void existingRoleIsValidatedWithoutSuperuserOrRoleAdminPrivileges(boolean unsafeRole) throws Exception {
        LocalPostgis postgres = newLocalPostgis();
        try {
            postgres.start();
            String original = Files.readString(Path.of(System.getProperty("user.dir"),
                    "src/main/resources/db/migration/B1__initial_schema.sql")).replace("\r\n", "\n");
            String installer = bundle();
            String installedB1 = installer.substring(installer.indexOf("-- BEGIN SOURCE: B1__initial_schema.sql"));
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                    var statement = connection.createStatement()) {
                try {
                    statement.execute("BEGIN");
                    // Fixture admin establishes the original role only inside this test transaction.
                    statement.execute(firstRoleBlock(original));
                    if (unsafeRole) statement.execute("ALTER ROLE motorescue_api INHERIT");
                    statement.execute("SET LOCAL ROLE motorescue_api");
                    // This role cannot ALTER roles; even weaker than hosted Supabase's postgres.
                    if (unsafeRole) {
                        SQLException failure = assertThrows(SQLException.class,
                                () -> statement.execute(firstRoleBlock(installedB1)));
                        assertTrue(failure.getMessage().contains("MOTORESCUE_API_ROLE_UNSAFE"));
                    } else {
                        statement.execute(firstRoleBlock(installedB1));
                    }
                } finally {
                    statement.execute("ROLLBACK"); // Restores all pre-test role attributes/passwords.
                }
            }
        } finally {
            postgres.afterAll(null);
        }
    }

    private static String firstRoleBlock(String sql) {
        int start = sql.indexOf("DO $$\n");
        int end = sql.indexOf("\n$$;", start);
        assertTrue(start >= 0 && end > start, "Missing runtime-role bootstrap block");
        return sql.substring(start, end + "\n$$;".length());
    }

    @Test
    void installsAndVerifiesInOneTransactionThenRefusesRerunWithoutLosingData() throws Exception {
        LocalPostgis postgres = newLocalPostgis();
        try {
            postgres.start();
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                    var statement = connection.createStatement()) {
                statement.execute(bundle());
                assertEquals(30, publicTableCount(connection));
                try (var result = statement.executeQuery(
                        "SELECT to_regclass('public.flyway_schema_history') IS NULL")) {
                    result.next();
                    assertTrue(result.getBoolean(1));
                }
                SQLException conflict = assertThrows(SQLException.class, () -> statement.execute(bundle()));
                assertTrue(conflict.getMessage().contains("PUBLIC_NOT_EMPTY_DO_NOT_RUN_CLEAN_INSTALL"));
                statement.execute("ROLLBACK");
                assertEquals(30, publicTableCount(connection));
            }
        } finally {
            postgres.afterAll(null); // Only removes this fixture's randomly named database.
        }
    }

    @Test
    void serverRoleCanProvisionFixturesButMobileCannotPromoteProfiles() throws Exception {
        LocalPostgis postgres = newLocalPostgis();
        try {
            postgres.start();
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                    var statement = connection.createStatement()) {
                statement.execute(bundle());
                try {
                    statement.execute("BEGIN");
                    statement.execute("""
                            INSERT INTO auth.users(id) VALUES
                              ('10000000-0000-4000-8000-000000000001'),
                              ('10000000-0000-4000-8000-000000000002');
                            SET LOCAL ROLE service_role;
                            UPDATE public.profiles SET role = 'admin'
                              WHERE id = '10000000-0000-4000-8000-000000000001';
                            UPDATE public.profiles SET role = 'provider'
                              WHERE id = '10000000-0000-4000-8000-000000000002';
                            INSERT INTO public.rescue_teams(id, name, partner_reference, hotline, base_latitude, base_longitude)
                              VALUES ('20000000-0000-4000-8000-000000000001', '[TEST] Grants', 'TEST-GRANTS',
                                '+12025550190', 16.061, 108.2238);
                            INSERT INTO public.provider_members(user_id, team_id, display_name, contact_phone_e164, status)
                              VALUES ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
                                '[TEST] Provider', '+12025550191', 'active');
                            INSERT INTO public.team_capabilities(team_id, service_code)
                              SELECT '20000000-0000-4000-8000-000000000001', code FROM public.service_types
                              WHERE is_active
                              ON CONFLICT (team_id, service_code) DO NOTHING;
                            INSERT INTO public.team_verification_checks(team_id, requirement_code, completed, checked_by, checked_at)
                              SELECT '20000000-0000-4000-8000-000000000001', code, TRUE,
                                '10000000-0000-4000-8000-000000000001', now() FROM public.team_verification_requirements
                              ON CONFLICT (team_id, requirement_code) DO NOTHING;
                            UPDATE public.rescue_teams SET status = 'verified',
                              verified_by = '10000000-0000-4000-8000-000000000001', verified_at = now()
                              WHERE id = '20000000-0000-4000-8000-000000000001';
                            """);
                    try (var rows = statement.executeQuery("SELECT count(*) FROM public.profiles")) {
                        rows.next();
                        assertEquals(2, rows.getInt(1)); // Service role can read both, without auth.uid().
                    }
                    statement.execute("SET LOCAL ROLE authenticated");
                    SQLException forbidden = assertThrows(SQLException.class, () -> statement.execute(
                            "UPDATE public.profiles SET role = 'admin' WHERE id = '10000000-0000-4000-8000-000000000002'"));
                    assertEquals("42501", forbidden.getSQLState());
                } finally {
                    statement.execute("ROLLBACK");
                }
            }
        } finally {
            postgres.afterAll(null);
        }
    }

    @Test
    void verificationFailureRollsBackSchemaInsteadOfLeavingAPartialInstallation() throws Exception {
        LocalPostgis postgres = newLocalPostgis();
        try {
            postgres.start();
            String sql = bundle().replace("-- BEGIN SCHEMA VERIFICATION",
                    "DO $$ BEGIN RAISE EXCEPTION 'FORCED_VERIFICATION_FAILURE'; END $$;\n"
                            + "-- BEGIN SCHEMA VERIFICATION");
            try (Connection connection = DriverManager.getConnection(
                    postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                    var statement = connection.createStatement()) {
                SQLException failure = assertThrows(SQLException.class, () -> statement.execute(sql));
                assertTrue(failure.getMessage().contains("FORCED_VERIFICATION_FAILURE"));
                statement.execute("ROLLBACK");
                assertEquals(0, publicTableCount(connection));
            }
        } finally {
            postgres.afterAll(null);
        }
    }

    private static int publicTableCount(Connection connection) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT count(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")) {
            rows.next();
            return rows.getInt(1);
        }
    }
}

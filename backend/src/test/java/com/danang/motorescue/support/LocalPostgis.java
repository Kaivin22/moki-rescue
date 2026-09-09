package com.danang.motorescue.support;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/** Native PostgreSQL/PostGIS test fixture. Never uses application/cloud credentials. */
public final class LocalPostgis implements BeforeAllCallback, AfterAllCallback {
    private final String database = "moki_test_" + UUID.randomUUID().toString().replace("-", "");
    private String baseUrl;
    private String username;
    private String password;
    private boolean created;
    private boolean initialized;

    @Override
    public void beforeAll(ExtensionContext context) { start(); }

    public synchronized void start() {
        if (initialized) return;
        if (!"true".equals(System.getenv("TEST_PG_ISOLATED"))) {
            throw new IllegalStateException("Integration tests require a dedicated native PostgreSQL/PostGIS cluster. "
                    + "See backend/TESTING.md and set TEST_PG_ISOLATED=true explicitly; tests are not skipped.");
        }
        String port = System.getenv().getOrDefault("TEST_PG_PORT", "5432");
        if (!port.matches("[0-9]{1,5}") || Integer.parseInt(port) < 1 || Integer.parseInt(port) > 65535) {
            throw new IllegalStateException("Invalid TEST_PG_PORT");
        }
        // Fixed loopback host and generated database name prevent accidental cloud/user DB resets.
        baseUrl = "jdbc:postgresql://127.0.0.1:" + port + "/";
        username = System.getenv().getOrDefault("TEST_PG_USER", "postgres");
        password = System.getenv("TEST_PG_PASSWORD");
        if (password == null || password.isBlank()) throw new IllegalStateException("TEST_PG_PASSWORD is required");
        try {
            try (Connection admin = connect("postgres"); var statement = admin.createStatement()) {
                try (var rows = statement.executeQuery("""
                        SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname NOT IN ('postgres', 'template0', 'template1')
                          AND datname !~ '^moki_test_[0-9a-f]{32}$') AS contains_user_database
                        """)) {
                    rows.next();
                    if (rows.getBoolean(1)) throw new IllegalStateException(
                            "Refusing a cluster containing non-test databases. Use a dedicated test PostgreSQL instance.");
                }
                statement.execute("CREATE DATABASE " + database + " TEMPLATE template0 ENCODING 'UTF8'");
                created = true;
            }
            try (Connection test = connect(database); var statement = test.createStatement();
                    var script = LocalPostgis.class.getResourceAsStream("/db/test/supabase-compatibility.sql")) {
                if (script == null) throw new IOException("Missing test compatibility script");
                statement.execute(new String(script.readAllBytes(), StandardCharsets.UTF_8));
            }
            initialized = true;
        } catch (SQLException | IOException exception) {
            cleanup();
            throw new IllegalStateException("Native PostgreSQL/PostGIS test setup failed. Check backend/TESTING.md.", exception);
        }
    }

    public String getJdbcUrl() { start(); return baseUrl + database; }
    public String getUsername() { start(); return username; }
    public String getPassword() { start(); return password; }

    private Connection connect(String target) throws SQLException {
        var properties = new java.util.Properties();
        properties.setProperty("user", username);
        properties.setProperty("password", password);
        properties.setProperty("connectTimeout", "5");
        properties.setProperty("socketTimeout", "30");
        return DriverManager.getConnection(baseUrl + target, properties);
    }

    @Override
    public void afterAll(ExtensionContext context) { cleanup(); }

    private synchronized void cleanup() {
        if (!created) return;
        if (!database.matches("moki_test_[0-9a-f]{32}")) throw new IllegalStateException("Unsafe test database name");
        // Only the randomly named database successfully created by this instance is removed.
        try (Connection admin = connect("postgres"); var statement = admin.createStatement()) {
            statement.execute("DROP DATABASE " + database + " WITH (FORCE)");
            created = false;
            initialized = false;
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not remove disposable database " + database, exception);
        }
    }
}

package com.danang.motorescue.support;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.core.JdbcTemplate;

public abstract class PostgisIntegrationTestSupport {

    protected static LocalPostgis newLocalPostgis() {
        return new LocalPostgis();
    }

    protected static Flyway flywayFor(LocalPostgis postgres) {
        return Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .cleanDisabled(true)
                .validateMigrationNaming(true)
                .load();
    }

    protected static DataSource dataSourceFor(LocalPostgis postgres) {
        return new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    protected static DataSource runtimeDataSourceFor(LocalPostgis postgres) {
        // Isolated disposable database only. Business code must exercise production grants.
        new JdbcTemplate(dataSourceFor(postgres)).execute(
                "ALTER ROLE motorescue_api PASSWORD 'local-integration-only'");
        return new DriverManagerDataSource(
                postgres.getJdbcUrl(), "motorescue_api", "local-integration-only");
    }
}

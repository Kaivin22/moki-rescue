package com.danang.motorescue.support;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

public abstract class PostgisIntegrationTestSupport {

    private static final DockerImageName POSTGIS_IMAGE = DockerImageName
            .parse("postgis/postgis:16-3.5")
            .asCompatibleSubstituteFor("postgres");

    protected static PostgreSQLContainer<?> newPostgisContainer() {
        return new PostgreSQLContainer<>(POSTGIS_IMAGE)
                .withDatabaseName("moki_rescue")
                .withUsername("postgres")
                .withPassword("postgres")
                .withInitScript("db/test/supabase-compatibility.sql");
    }

    protected static Flyway flywayFor(PostgreSQLContainer<?> postgres) {
        return Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .cleanDisabled(true)
                .validateMigrationNaming(true)
                .load();
    }

    protected static DataSource dataSourceFor(PostgreSQLContainer<?> postgres) {
        return new DriverManagerDataSource(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }
}

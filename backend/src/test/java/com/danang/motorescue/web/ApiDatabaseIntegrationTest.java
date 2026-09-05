package com.danang.motorescue.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = {
        "app.routing.motorbike-base-url=https://routing.example.invalid", "app.assistant.enabled=false",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://auth.example.invalid/auth/v1",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.example.invalid/jwks",
        "app.legal.current-version=2026-08-22",
        "app.matching.recovery-scan-interval-ms=3600000", "app.matching.expiry-scan-interval-ms=3600000",
        "app.case-lifecycle.scan-interval-ms=3600000", "app.push.outbox-scan-interval-ms=3600000"
})
@AutoConfigureMockMvc
@Testcontainers
class ApiDatabaseIntegrationTest extends PostgisIntegrationTestSupport {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = newPostgisContainer();
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate runtime;
    @MockitoBean JwtDecoder decoder;
    // All application beans/jobs are real. Only JWT decoding is replaced; no live identity provider.

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        POSTGRES.start();
        flywayFor(POSTGRES).migrate();
        runtimeDataSourceFor(POSTGRES);
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", () -> "motorescue_api");
        properties.add("spring.datasource.password", () -> "local-integration-only");
    }

    @BeforeEach
    void reset() {
        new JdbcTemplate(dataSourceFor(POSTGRES)).execute("TRUNCATE auth.users CASCADE");
        assertThat(runtime.queryForObject("SELECT current_user", String.class)).isEqualTo("motorescue_api");
    }

    @Test
    void securityFilterRejectsMissingOrInvalidBearerAndAllowsHealth() throws Exception {
        mvc.perform(get("/api/health/ready")).andExpect(status().isOk());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        when(decoder.decode("invalid")).thenThrow(new BadJwtException("Invalid test token"));
        mvc.perform(get("/api/me").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void pushValidationAndDeletionUseRealControllersTransactionsAndRuntimeGrants() throws Exception {
        String token = tokenFor("customer", true);
        mvc.perform(put("/api/me/push-device").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(put("/api/me/push-device").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"token":"ExpoPushToken[http]","installationId":"%s","platform":"android"}
                        """.formatted(UUID.randomUUID())))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/me/deletion-request").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_INACTIVE"));
    }

    @Test
    void currentConsentIsRequiredEvenWithValidIdentity() throws Exception {
        String token = tokenFor("customer", false);
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"));
    }

    @Test
    void customerCannotReadAnotherCustomersCaseAndProviderCannotCreateOne() throws Exception {
        String first = tokenFor("customer", true);
        String second = tokenFor("customer", true);
        String provider = tokenFor("provider", true);
        String body = """
                {"serviceCode":"flat_tire","vehiclePowerType":"gasoline","vehicleDescription":"Honda",
                 "pickupAreaLabel":"Hai Chau","latitude":16.0544,"longitude":108.2022,
                 "pickupSource":"gps","pickupAccuracyM":20,"hasInjury":false,"hasImmediateHazard":false,
                 "safetyAcknowledged":true}
                """;
        String response = mvc.perform(post("/api/requests").header("Authorization", "Bearer " + first)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response).path("id").asText();
        mvc.perform(get("/api/requests/" + id).header("Authorization", "Bearer " + first)).andExpect(status().isOk());
        mvc.perform(get("/api/requests/" + id).header("Authorization", "Bearer " + second)).andExpect(status().isNotFound());
        mvc.perform(post("/api/requests").header("Authorization", "Bearer " + provider)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    }

    private String tokenFor(String role, boolean consent) {
        UUID id = UUID.randomUUID();
        var owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        owner.update("INSERT INTO auth.users(id) VALUES (?)", id);
        owner.update("""
                UPDATE public.profiles SET role = ?, terms_version = CASE WHEN ? THEN '2026-08-22' ELSE NULL END,
                  terms_accepted_at = CASE WHEN ? THEN NOW() ELSE NULL END WHERE id = ?
                """, role, consent, consent, id);
        String token = "test-" + id;
        when(decoder.decode(token)).thenReturn(Jwt.withTokenValue(token).header("alg", "RS256")
                .subject(id.toString()).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build());
        return token;
    }
}

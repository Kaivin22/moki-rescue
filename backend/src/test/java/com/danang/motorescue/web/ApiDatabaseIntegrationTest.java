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
import com.danang.motorescue.support.LocalPostgis;
import org.junit.jupiter.api.extension.RegisterExtension;

@SpringBootTest(properties = {
        "app.routing.motorbike-base-url=https://routing.example.invalid", "app.assistant.enabled=false",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://auth.example.invalid/auth/v1",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.example.invalid/jwks",
        "app.legal.current-version=2026-08-22",
        "app.matching.recovery-scan-interval-ms=3600000", "app.matching.expiry-scan-interval-ms=3600000",
        "app.case-lifecycle.scan-interval-ms=3600000", "app.push.outbox-scan-interval-ms=3600000"
})
@AutoConfigureMockMvc
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class ApiDatabaseIntegrationTest extends PostgisIntegrationTestSupport {
    @RegisterExtension
    static final LocalPostgis POSTGRES = newLocalPostgis();
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
    void readinessRejectsMissingWorkingHoursSchemaGuardsAndRuntimeGrants() throws Exception {
        var owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        String[][] changes = {
            {"ALTER TABLE public.team_working_hours RENAME TO hidden_working_hours",
             "ALTER TABLE public.hidden_working_hours RENAME TO team_working_hours"},
            {"ALTER TABLE public.rescue_teams RENAME COLUMN receiving_paused TO hidden_paused",
             "ALTER TABLE public.rescue_teams RENAME COLUMN hidden_paused TO receiving_paused"},
            {"ALTER TABLE public.rescue_teams RENAME COLUMN working_hours_version TO hidden_version",
             "ALTER TABLE public.rescue_teams RENAME COLUMN hidden_version TO working_hours_version"},
            {"ALTER TABLE public.provider_members RENAME COLUMN availability_until TO hidden_until",
             "ALTER TABLE public.provider_members RENAME COLUMN hidden_until TO availability_until"},
            {"ALTER TABLE public.dispatch_offers RENAME COLUMN availability_started_at TO hidden_started",
             "ALTER TABLE public.dispatch_offers RENAME COLUMN hidden_started TO availability_started_at"},
            {"ALTER FUNCTION public.api_offer_is_receivable(uuid,timestamptz) RENAME TO hidden_receivable",
             "ALTER FUNCTION public.hidden_receivable(uuid,timestamptz) RENAME TO api_offer_is_receivable"},
            {"ALTER TABLE public.provider_members DISABLE TRIGGER provider_availability_hours",
             "ALTER TABLE public.provider_members ENABLE TRIGGER provider_availability_hours"},
            {"ALTER TABLE public.dispatch_offers DISABLE TRIGGER dispatch_offer_hours",
             "ALTER TABLE public.dispatch_offers ENABLE TRIGGER dispatch_offer_hours"},
            {"REVOKE EXECUTE ON FUNCTION public.api_team_receiving_until(uuid,timestamptz) FROM motorescue_api",
             "GRANT EXECUTE ON FUNCTION public.api_team_receiving_until(uuid,timestamptz) TO motorescue_api"},
            {"REVOKE UPDATE ON public.team_working_hours FROM motorescue_api",
             "GRANT UPDATE ON public.team_working_hours TO motorescue_api"}
        };
        for (String[] change : changes) {
            owner.execute(change[0]);
            try {
                mvc.perform(get("/api/health/ready"))
                        .andExpect(status().isServiceUnavailable())
                        .andExpect(jsonPath("$.status").value("not_ready"));
                mvc.perform(get("/api/health")).andExpect(status().isOk());
            } finally {
                owner.execute(change[1]);
            }
            mvc.perform(get("/api/health/ready")).andExpect(status().isOk());
        }
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
    void partnerCatalogExposesOnlyVerifiedShopAddressesAndCoordinates() throws Exception {
        String customer = tokenFor("customer", true);
        var owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        // No available providers or working hours: this is a partner directory, not dispatch availability.
        owner.update("""
                INSERT INTO public.rescue_teams(name,partner_reference,status,hotline,base_address,base_latitude,base_longitude,verified_at)
                VALUES ('Visible shop','MAP-VISIBLE','verified','+84912345678','123 Sample Street',16.0544,108.2022,NOW()),
                       ('Pending shop','MAP-PENDING','pending','+84912345678','123 Sample Street',16.0544,108.2022,NULL),
                       ('Suspended shop','MAP-SUSPENDED','suspended','+84912345678','123 Sample Street',16.0544,108.2022,NOW()),
                       ('No address','MAP-NOADDRESS','verified','+84912345678',NULL,16.0544,108.2022,NOW()),
                       ('No location','MAP-NOLOCATION','verified','+84912345678','123 Sample Street',NULL,NULL,NOW()),
                       ('Outside area','MAP-OUTSIDE','verified','+84912345678','123 Sample Street',21.03,105.85,NOW())
                """);
        mvc.perform(get("/api/catalog/partner-shops")).andExpect(status().isUnauthorized());
        String response = mvc.perform(get("/api/catalog/partner-shops").header("Authorization", "Bearer " + customer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Visible shop"))
                .andExpect(jsonPath("$[0].address").value("123 Sample Street"))
                .andReturn().getResponse().getContentAsString();
        var fields = new java.util.HashSet<String>();
        new com.fasterxml.jackson.databind.ObjectMapper().readTree(response).get(0).fieldNames().forEachRemaining(fields::add);
        assertThat(fields).containsExactlyInAnyOrder("id", "name", "address", "latitude", "longitude");
        owner.update("UPDATE public.rescue_teams SET status = 'suspended' WHERE partner_reference='MAP-VISIBLE'");
        mvc.perform(get("/api/catalog/partner-shops").header("Authorization", "Bearer " + customer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
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

    @Test
    void providerStatisticsAreSelfScopedAndOperatorApprovalRoutesAreAdminOnly() throws Exception {
        String provider = tokenFor("provider", true);
        String customer = tokenFor("customer", true);
        String admin = tokenFor("admin", true);
        mvc.perform(get("/api/provider/statistics").header("Authorization", "Bearer " + provider))
                .andExpect(status().isOk()).andExpect(jsonPath("$.completedCases").value(0));
        mvc.perform(get("/api/provider/statistics").header("Authorization", "Bearer " + customer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/operator/providers").header("Authorization", "Bearer " + provider))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/operator/providers/" + UUID.randomUUID() + "/review")
                .header("Authorization", "Bearer " + provider).contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"active\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/operator/providers").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("unassigned"));
    }

    @Test
    void hoursRoutesRequireAdminAndValidateBeforeWriting() throws Exception {
        String provider = tokenFor("provider", true);
        String customer = tokenFor("customer", true);
        String admin = tokenFor("admin", true);
        String endpoint = "/api/operator/teams/" + UUID.randomUUID() + "/working-hours";
        for (String token : new String[] {provider, customer}) {
            mvc.perform(get(endpoint).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
            mvc.perform(put(endpoint).header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"paused\":false,\"expectedVersion\":0,\"days\":[]}"))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(put(endpoint).header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"paused\":false,\"expectedVersion\":0,\"days\":[{\"dayOfWeek\":8,\"opensMinute\":0,\"closesMinute\":1440}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/provider/working-hours").header("Authorization", "Bearer " + customer))
                .andExpect(status().isForbidden());
    }

    @Test
    void partnerEnrollmentRequiresAdminAndRecipientConsentAndKeepsShopAndProviderSeparate() throws Exception {
        String applicant = tokenFor("customer", true), admin = tokenFor("admin", true);
        String invitee = tokenFor("customer", true), outsider = tokenFor("customer", true);
        UUID applicantId = UUID.fromString(applicant.substring(5)), inviteeId = UUID.fromString(invitee.substring(5));
        var owner = new JdbcTemplate(dataSourceFor(POSTGRES));
        owner.update("UPDATE auth.users SET phone='84912345678' WHERE id=?", inviteeId);
        String body = """
                {"name":"Enrollment shop","address":"123 Hai Chau Street","contactPhone":"+84987654321",
                 "latitude":16.0544,"longitude":108.2022,"serviceCodes":["flat_tire"]}
                """;
        String response = mvc.perform(post("/api/partners/applications").header("Authorization", "Bearer " + applicant)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        UUID applicationId = UUID.fromString(new com.fasterxml.jackson.databind.ObjectMapper().readTree(response).get("id").asText());
        mvc.perform(post("/api/partners/applications").header("Authorization", "Bearer " + applicant)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
        mvc.perform(get("/api/partners/applications").header("Authorization", "Bearer " + outsider))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        String review = """
                {"decision":"approved","note":"Verified shop and representative authority offline",
                 "checkedCodes":["partnership_verified","representative_contact","service_hotline","service_area","capability_equipment","provider_roster"]}
                """;
        String reviewUrl = "/api/partners/applications/" + applicationId + "/review";
        mvc.perform(post(reviewUrl).header("Authorization", "Bearer " + applicant).contentType(MediaType.APPLICATION_JSON).content(review))
                .andExpect(status().isForbidden());
        mvc.perform(post(reviewUrl).header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"approved\",\"note\":\"Not checked yet\",\"checkedCodes\":[]}"))
                .andExpect(status().isConflict());
        mvc.perform(post(reviewUrl).header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON).content(review))
                .andExpect(status().isNoContent());
        UUID teamId = runtime.queryForObject("SELECT team_id FROM public.shop_applications WHERE id=?", UUID.class, applicationId);
        assertThat(runtime.queryForObject("SELECT role FROM public.profiles WHERE id=?", String.class, applicantId)).isEqualTo("customer");
        assertThat(runtime.queryForObject("SELECT COUNT(*) FROM public.provider_members WHERE user_id=?", Integer.class, applicantId)).isZero();
        mvc.perform(get("/api/operator/teams/" + teamId + "/verification").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.readyToVerify").value(true))
                .andExpect(jsonPath("$.hasRepresentative").value(true)).andExpect(jsonPath("$.activeProviderCount").value(0));
        String inviteUrl = "/api/partners/shops/" + teamId + "/invitations";
        String inviteBody = "{\"phone\":\"+84912345678\",\"rosterConfirmed\":true}";
        mvc.perform(post(inviteUrl).header("Authorization", "Bearer " + outsider).contentType(MediaType.APPLICATION_JSON).content(inviteBody))
                .andExpect(status().isForbidden());
        mvc.perform(post(inviteUrl).header("Authorization", "Bearer " + applicant).contentType(MediaType.APPLICATION_JSON).content(inviteBody))
                .andExpect(status().isNoContent());
        UUID invitation = runtime.queryForObject("SELECT id FROM public.team_invitations WHERE team_id=?", UUID.class, teamId);
        assertThat(runtime.queryForObject("SELECT role FROM public.profiles WHERE id=?", String.class, inviteeId)).isEqualTo("customer");
        assertThat(runtime.queryForObject("SELECT COUNT(*) FROM public.user_notifications WHERE user_id=? AND target_type='team_invitation'", Integer.class, inviteeId)).isEqualTo(1);
        String answerUrl = "/api/partners/invitations/" + invitation + "/answer";
        mvc.perform(post(answerUrl).header("Authorization", "Bearer " + outsider).contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"accepted\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post(answerUrl).header("Authorization", "Bearer " + invitee).contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"accepted\"}"))
                .andExpect(status().isNoContent());
        assertThat(runtime.queryForObject("SELECT role FROM public.profiles WHERE id=?", String.class, inviteeId)).isEqualTo("provider");
        assertThat(runtime.queryForObject("SELECT is_available FROM public.provider_members WHERE user_id=?", Boolean.class, inviteeId)).isFalse();
        mvc.perform(post(answerUrl).header("Authorization", "Bearer " + invitee).contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"accepted\"}"))
                .andExpect(status().isConflict());
        String removeUrl = "/api/partners/shops/" + teamId + "/members/" + inviteeId + "/remove";
        mvc.perform(post(removeUrl).header("Authorization", "Bearer " + outsider)).andExpect(status().isForbidden());
        UUID openCase = UUID.randomUUID();
        owner.update("""
                INSERT INTO public.rescue_requests(id,customer_id,service_code,idempotency_key,status,vehicle_power_type,
                  pickup_area_label,pickup_latitude,pickup_longitude,pickup_source,safety_acknowledged,assigned_team_id,assigned_provider_id)
                VALUES (?,?,'flat_tire',?,'assigned','gasoline','Hai Chau',16.0544,108.2022,'manual',TRUE,?,?)
                """,openCase,UUID.fromString(outsider.substring(5)),UUID.randomUUID(),teamId,inviteeId);
        mvc.perform(post(removeUrl).header("Authorization", "Bearer " + applicant)).andExpect(status().isConflict());
        assertThat(runtime.queryForObject("SELECT status FROM public.provider_members WHERE user_id=?",String.class,inviteeId)).isEqualTo("active");
        owner.update("UPDATE public.rescue_requests SET status='cancelled' WHERE id=?",openCase);
        mvc.perform(post(removeUrl).header("Authorization", "Bearer " + applicant)).andExpect(status().isNoContent());
        assertThat(runtime.queryForObject("SELECT status FROM public.provider_members WHERE user_id=?", String.class, inviteeId)).isEqualTo("left");
        assertThat(runtime.queryForObject("SELECT role FROM public.profiles WHERE id=?", String.class, inviteeId)).isEqualTo("customer");
        assertThat(runtime.queryForObject("SELECT assigned_provider_id FROM public.rescue_requests WHERE id=?",UUID.class,openCase)).isEqualTo(inviteeId);
        mvc.perform(post("/api/partners/shops/" + teamId + "/members/" + applicantId + "/remove")
                .header("Authorization", "Bearer " + applicant)).andExpect(status().isConflict());
        // Re-invite, expiry and suspension are checked again at acceptance time, not just at display time.
        mvc.perform(post(inviteUrl).header("Authorization", "Bearer " + applicant).contentType(MediaType.APPLICATION_JSON).content(inviteBody))
                .andExpect(status().isNoContent());
        UUID second = runtime.queryForObject("SELECT id FROM public.team_invitations WHERE team_id=? AND status='pending'", UUID.class, teamId);
        owner.update("UPDATE public.team_invitations SET expires_at=NOW()-INTERVAL '1 second' WHERE id=?", second);
        mvc.perform(post("/api/partners/invitations/" + second + "/answer").header("Authorization", "Bearer " + invitee)
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"accepted\"}")).andExpect(status().isConflict());
        owner.update("UPDATE public.rescue_teams SET status='suspended' WHERE id=?", teamId);
        owner.update("UPDATE public.team_invitations SET expires_at=NOW()+INTERVAL '1 day' WHERE id=?", second);
        mvc.perform(post("/api/partners/invitations/" + second + "/answer").header("Authorization", "Bearer " + invitee)
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"accepted\"}")).andExpect(status().isConflict());
        mvc.perform(post(inviteUrl).header("Authorization", "Bearer " + applicant).contentType(MediaType.APPLICATION_JSON).content(inviteBody))
                .andExpect(status().isConflict());
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

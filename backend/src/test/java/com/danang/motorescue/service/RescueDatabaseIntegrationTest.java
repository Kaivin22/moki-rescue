package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.danang.motorescue.config.CaseLifecycleProperties;
import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.model.ApiModels.AvailabilityRequest;
import com.danang.motorescue.model.ApiModels.ProviderLocationRequest;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.RoadRoutingService.RoadPoint;
import com.danang.motorescue.service.RoadRoutingService.RoadRoute;
import com.danang.motorescue.support.PostgisIntegrationTestSupport;
import com.danang.motorescue.web.ApiException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.danang.motorescue.support.LocalPostgis;
import org.junit.jupiter.api.extension.RegisterExtension;

class RescueDatabaseIntegrationTest extends PostgisIntegrationTestSupport {

    private static final double PICKUP_LATITUDE = 16.0544;
    private static final double PICKUP_LONGITUDE = 108.2022;

    @RegisterExtension
    static final LocalPostgis POSTGRES = newLocalPostgis();

    private static final AtomicInteger FIXTURE_SEQUENCE = new AtomicInteger();
    private static DataSource dataSource;
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transactions;
    private static JdbcTemplate runtimeJdbc;
    private static TransactionTemplate runtimeTransactions;

    private MatchingProperties matchingPolicy;
    private RescuePolicyProperties rescuePolicy;
    private QualityProperties qualityPolicy;
    private PushNotificationService push;
    private RoadRoutingService routing;
    private DispatchService matchingDispatch;
    private DispatchService creationDispatch;
    private ProviderService providers;

    @BeforeAll
    static void migrateDatabase() {
        flywayFor(POSTGRES).migrate();
        dataSource = dataSourceFor(POSTGRES);
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        var runtimeDataSource = runtimeDataSourceFor(POSTGRES);
        runtimeJdbc = new JdbcTemplate(runtimeDataSource);
        runtimeTransactions = new TransactionTemplate(new DataSourceTransactionManager(runtimeDataSource));
    }

    @BeforeEach
    void resetDatabaseAndServices() {
        jdbc.execute("TRUNCATE TABLE auth.users CASCADE");
        jdbc.update("""
                UPDATE public.service_types
                SET matching_eta_window_seconds = 300,
                    matching_eta_weight = 0.55,
                    matching_experience_weight = 0.15,
                    matching_waiting_weight = 0.15,
                    matching_recent_cases_weight = 0.15,
                    matching_experience_reference_cases = 50,
                    matching_waiting_reference_seconds = 7200,
                    matching_recent_window_days = 7,
                    matching_recent_reference_cases = 10,
                    matching_starvation_skip_threshold = 3,
                    matching_offer_ttl_seconds = 45
                """);
        FIXTURE_SEQUENCE.set(0);

        matchingPolicy = new MatchingProperties(180, 150);
        rescuePolicy = new RescuePolicyProperties(
                Duration.ofMinutes(10), 3, 100, 3,
                Duration.ofDays(30), 3, Duration.ofHours(24),
                Duration.ofMinutes(5), 150, 200, Duration.ofDays(30));
        qualityPolicy = new QualityProperties(5, 3.5, 3.0, 3, 3, 30);
        push = mock(PushNotificationService.class);
        routing = mock(RoadRoutingService.class);
        matchingDispatch = new DispatchService(runtimeJdbc, runtimeTransactions, routing, matchingPolicy, push);
        creationDispatch = mock(DispatchService.class);
        providers = new ProviderService(
                runtimeJdbc, runtimeTransactions, matchingDispatch, new AuditService(runtimeJdbc), push,
                matchingPolicy, rescuePolicy, qualityPolicy, new ServiceAreaService(runtimeJdbc));
    }

    @Test
    void availabilityCanTurnOffWithoutSendingCoordinates() {
        UUID teamId = createTeam();
        ProviderFixture fixture = createProvider(teamId, PICKUP_LATITUDE, PICKUP_LONGITUDE, 10, false);
        assertThat(providers.setAvailability(fixture.actor(),
                new AvailabilityRequest(true, PICKUP_LATITUDE, PICKUP_LONGITUDE, 10.0)).available()).isTrue();
        assertThat(providers.setAvailability(fixture.actor(),
                new AvailabilityRequest(false, null, null, null)).available()).isFalse();
        var row = jdbc.queryForMap("SELECT last_latitude, last_longitude, location_accuracy_m FROM public.provider_members WHERE user_id = ?", fixture.actor().id());
        assertThat(row.get("last_latitude")).isNull();
        assertThat(row.get("last_longitude")).isNull();
        assertThat(row.get("location_accuracy_m")).isNull();
    }

    @Test
    void demoCoverageIncludesEdgesButRejectsEveryOutsideDirection() {
        var area = new ServiceAreaService(runtimeJdbc);
        for (double[] point : new double[][] {
                {16.0611, 108.2201}, {15.95, 108.05}, {16.18, 108.34},
                {15.95, 108.34}, {16.18, 108.05}, {16.18, 108.20}, {16.06, 108.05},
                {15.950001, 108.050001}, {16.179999, 108.339999}}) {
            assertThat(area.contains(point[0], point[1])).as("inside/border %s,%s", point[0], point[1]).isTrue();
        }
        for (double[] point : new double[][] {
                {15.949999, 108.20}, {16.180001, 108.20}, {16.06, 108.049999}, {16.06, 108.340001},
                {10.77, 106.7}, {108.22, 16.06}}) {
            assertThat(area.contains(point[0], point[1])).as("outside %s,%s", point[0], point[1]).isFalse();
        }
        transactions.executeWithoutResult(tx -> {
            jdbc.update("UPDATE public.service_zones SET is_active = FALSE");
            assertThat(new ServiceAreaService(jdbc).contains(16.0611, 108.2201)).isFalse();
            tx.setRollbackOnly();
        });
    }

    @Test
    void providerLeavingCoverageIsDisabledWithoutCancellingAssignedWork() {
        var provider = createProvider(createTeam(), PICKUP_LATITUDE, PICKUP_LONGITUDE, 10, true);
        UUID requestId = insertRequest(createActor("customer"), "assigned", provider);
        assertApiCode("PROVIDER_OUTSIDE_SERVICE_AREA", () -> providers.saveAvailabilityLocation(provider.actor(),
                new ProviderLocationRequest(16.181, 108.22, 10.0)));
        var row = jdbc.queryForMap("SELECT is_available, last_latitude, last_longitude FROM public.provider_members WHERE user_id = ?", provider.actor().id());
        assertThat(row.get("is_available")).isEqualTo(false);
        assertThat(row.get("last_latitude")).isNull();
        assertThat(row.get("last_longitude")).isNull();
        assertThat(jdbc.queryForObject("SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId)).isEqualTo("assigned");
        assertApiCode("PROVIDER_OUTSIDE_SERVICE_AREA", () -> providers.setAvailability(provider.actor(),
                new AvailabilityRequest(true, 16.181, 108.22, 10.0)));
        assertThat(providers.setAvailability(provider.actor(), new AvailabilityRequest(false, null, null, null)).available()).isFalse();
    }

    @Test
    void staleOutOfAreaProviderCannotBeAssignedEvenThroughDirectDatabaseTransition() {
        var provider = createProvider(createTeam(), 15.949, PICKUP_LONGITUDE, 10, true);
        UUID requestId = insertRequest(createActor("customer"), "offered", null);
        assertThatThrownBy(() -> runtimeJdbc.update("UPDATE public.rescue_requests SET status = 'assigned', assigned_provider_id = ?, assigned_team_id = ? WHERE id = ?",
                provider.actor().id(), provider.teamId(), requestId))
                .hasMessageContaining("OFFER_OUTSIDE_SERVICE_AREA");
        assertThat(jdbc.queryForObject("SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId)).isEqualTo("offered");
    }

    @Test
    void customerCreationUsesRealPostgisTransactionAndIdempotency() {
        Actor customer = createActor("customer");
        RescueCreationService creation = creationService();
        UUID idempotencyKey = UUID.randomUUID();
        CreateRequest request = validCreateRequest("Honda Wave");

        UUID created = creation.create(customer, idempotencyKey, request);
        UUID replayed = creation.create(customer, idempotencyKey, request);

        assertThat(replayed).isEqualTo(created);
        assertThat(count("public.rescue_requests")).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT extensions.ST_Distance(
                  pickup_location,
                  extensions.ST_SetSRID(extensions.ST_MakePoint(?, ?), 4326)::extensions.geography)
                FROM public.rescue_requests WHERE id = ?
                """, Double.class, PICKUP_LONGITUDE, PICKUP_LATITUDE, created)).isLessThan(0.01);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.audit_logs WHERE action = 'request.created'",
                Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.request_status_events WHERE request_id = ? AND to_status = 'searching'",
                Integer.class, created)).isEqualTo(1);
        verify(creationDispatch, times(1)).match(created);

        assertApiCode("IDEMPOTENCY_KEY_REUSED",
                () -> creation.create(customer, idempotencyKey, validCreateRequest("Yamaha Sirius")));
        assertThat(count("public.rescue_requests")).isEqualTo(1);
    }

    @Test
    void customerCannotCreateAnotherActiveRequest() {
        Actor customer = createActor("customer");
        RescueCreationService creation = creationService();
        CreateRequest request = validCreateRequest("Honda Vision");

        creation.create(customer, UUID.randomUUID(), request);

        assertApiCode("ACTIVE_REQUEST_EXISTS",
                () -> creation.create(customer, UUID.randomUUID(), request));
        assertThat(count("public.rescue_requests")).isEqualTo(1);
        assertThat(count("public.audit_logs")).isEqualTo(1);
    }

    @Test
    void lifecycleUsesDatabaseTriggerAndRejectsStaleVersion() {
        Actor customer = createActor("customer");
        UUID teamId = createTeam();
        addCapability(teamId);
        ProviderFixture provider = createProvider(teamId, PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
        UUID requestId = insertRequest(customer, "assigned", provider);
        RescueLifecycleService lifecycle = lifecycleService();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE public.rescue_requests SET status = 'completed' WHERE id = ?", requestId))
                .hasStackTraceContaining("INVALID_REQUEST_TRANSITION_assigned_TO_completed");
        assertApiCode("INVALID_REQUEST_ACTION", () -> lifecycle.act(
                provider.actor(), requestId,
                new StateActionRequest("request_completion", null, null, null, 1)));

        lifecycle.act(provider.actor(), requestId,
                new StateActionRequest("start_trip", null, null, null, 1));

        Map<String, Object> state = jdbc.queryForMap(
                "SELECT status, version FROM public.rescue_requests WHERE id = ?", requestId);
        assertThat(state.get("status")).isEqualTo("en_route");
        assertThat(((Number) state.get("version")).intValue()).isEqualTo(2);
        assertThat(jdbc.queryForObject("""
                SELECT actor_id FROM public.request_status_events
                WHERE request_id = ? AND to_status = 'en_route'
                """, UUID.class, requestId)).isEqualTo(provider.actor().id());

        assertApiCode("REQUEST_VERSION_CONFLICT", () -> lifecycle.act(
                provider.actor(), requestId,
                new StateActionRequest("request_arrival", null, null, null, 1)));
        assertThat(jdbc.queryForObject(
                "SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId))
                .isEqualTo("en_route");
    }

    @Test
    void databaseRejectsInvalidAssignmentAndLocationCheckpoint() {
        Actor customer = createActor("customer");
        UUID providerTeam = createTeam();
        UUID wrongTeam = createTeam();
        ProviderFixture provider = createProvider(
                providerTeam, PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
        UUID searchingRequest = insertRequest(customer, "searching", null);

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO public.provider_location_checkpoints(
                  request_id, provider_id, latitude, longitude, accuracy_m)
                VALUES (?, ?, ?, ?, ?)
                """, searchingRequest, provider.actor().id(),
                PICKUP_LATITUDE, PICKUP_LONGITUDE, 20))
                .hasStackTraceContaining("LOCATION_CHECKPOINT_NOT_ALLOWED");

        assertThatThrownBy(() -> insertRequest(
                customer, "assigned", new ProviderFixture(provider.actor(), wrongTeam)))
                .hasStackTraceContaining("INVALID_PROVIDER_ASSIGNMENT");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.rescue_requests WHERE status = 'assigned'",
                Integer.class)).isZero();
    }

    @Test
    void matchingUsesPostgisAndExcludesStaleOrInaccurateGps() {
        Actor customer = createActor("customer");
        UUID teamId = createTeam();
        addCapability(teamId);
        ProviderFixture eligible = createProvider(
                teamId, PICKUP_LATITUDE + 0.002, PICKUP_LONGITUDE + 0.002, 25, true);
        ProviderFixture stale = createProvider(
                teamId, PICKUP_LATITUDE + 0.003, PICKUP_LONGITUDE + 0.003, 25, true);
        ProviderFixture inaccurate = createProvider(
                teamId, PICKUP_LATITUDE + 0.004, PICKUP_LONGITUDE + 0.004, 300, true);
        ProviderFixture farAway = createProvider(teamId, 17.0, 109.0, 25, true);
        jdbc.update("""
                UPDATE public.provider_members
                SET location_updated_at = NOW() - INTERVAL '10 minutes'
                WHERE user_id = ?
                """, stale.actor().id());
        stubSuccessfulRoutes();
        UUID requestId = insertRequest(customer, "searching", null);

        matchingDispatch.match(requestId);

        List<UUID> offeredProviders = jdbc.query(
                "SELECT provider_id FROM public.dispatch_offers WHERE request_id = ? ORDER BY provider_id",
                (rs, rowNum) -> rs.getObject(1, UUID.class), requestId);
        assertThat(offeredProviders).containsExactly(eligible.actor().id());
        assertThat(offeredProviders).doesNotContain(
                stale.actor().id(), inaccurate.actor().id(), farAway.actor().id());
        assertThat(jdbc.queryForObject(
                "SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId))
                .isEqualTo("offered");
        verify(routing).routesToDestination(
                org.mockito.ArgumentMatchers.argThat(origins -> origins.size() == 1), any());

        assertApiCode("LOCATION_NOT_ACCURATE", () -> providers.saveAvailabilityLocation(
                inaccurate.actor(),
                new ProviderLocationRequest(PICKUP_LATITUDE, PICKUP_LONGITUDE, 300.0)));
    }

    @Test
    void matchingCountsCompletedCasesOfTheRequestedServiceAsExperience() {
        UUID teamId = createTeam();
        addCapability(teamId);
        double nearLatitude = PICKUP_LATITUDE + 0.001;
        ProviderFixture nearNewcomer = createProvider(
                teamId, nearLatitude, PICKUP_LONGITUDE + 0.001, 20, true);
        ProviderFixture experienced = createProvider(
                teamId, PICKUP_LATITUDE + 0.004, PICKUP_LONGITUDE + 0.004, 20, true);
        insertCompletedExperience(experienced, "flat_tire");
        insertCompletedExperience(experienced, "flat_tire");

        jdbc.update("""
                UPDATE public.service_types
                SET matching_eta_window_seconds = 300,
                    matching_eta_weight = 0.2,
                    matching_experience_weight = 0.8,
                    matching_waiting_weight = 0,
                    matching_recent_cases_weight = 0,
                    matching_experience_reference_cases = 2
                WHERE code = 'flat_tire'
                """);
        matchingPolicy = new MatchingProperties(180, 150);
        matchingDispatch = new DispatchService(
                runtimeJdbc, runtimeTransactions, routing, matchingPolicy, push);
        when(routing.routesToDestination(anyList(), any())).thenAnswer(invocation -> {
            List<RoadPoint> origins = invocation.getArgument(0);
            return origins.stream().map(origin -> {
                boolean isNear = Math.abs(origin.latitude() - nearLatitude) < 0.000001;
                return Optional.of(isNear
                        ? new RoadRoute(1_000, 300, List.of())
                        : new RoadRoute(2_000, 480, List.of()));
            }).toList();
        });
        UUID requestId = insertRequest(createActor("customer"), "searching", null);

        matchingDispatch.match(requestId);

        List<UUID> offeredProviders = jdbc.query(
                "SELECT provider_id FROM public.dispatch_offers WHERE request_id = ?",
                (rs, rowNum) -> rs.getObject(1, UUID.class), requestId);
        assertThat(offeredProviders).containsExactly(experienced.actor().id());
        assertThat(offeredProviders).doesNotContain(nearNewcomer.actor().id());
    }

    @Test
    void repeatedlySkippedEligibleProviderReceivesTheNextSequentialOffer() {
        UUID teamId = createTeam();
        addCapability(teamId);
        ProviderFixture experienced = createProvider(
                teamId, PICKUP_LATITUDE + 0.001, PICKUP_LONGITUDE + 0.001, 20, true);
        ProviderFixture newcomer = createProvider(
                teamId, PICKUP_LATITUDE + 0.002, PICKUP_LONGITUDE + 0.002, 20, true);
        insertCompletedExperience(experienced, "flat_tire");
        jdbc.update("""
                UPDATE public.service_types
                SET matching_eta_window_seconds = 300,
                    matching_eta_weight = 0,
                    matching_experience_weight = 1,
                    matching_waiting_weight = 0,
                    matching_recent_cases_weight = 0,
                    matching_experience_reference_cases = 1,
                    matching_starvation_skip_threshold = 2
                WHERE code = 'flat_tire'
                """);
        stubSuccessfulRoutes();

        for (int round = 0; round < 2; round++) {
            UUID requestId = insertRequest(createActor("customer"), "searching", null);
            matchingDispatch.match(requestId);
            assertThat(pendingOfferProvider(requestId)).isEqualTo(experienced.actor().id());
            closeUnacceptedRequest(requestId);
        }

        assertThat(jdbc.queryForObject("""
                SELECT consecutive_skips FROM public.provider_dispatch_stats
                WHERE provider_id = ? AND service_code = 'flat_tire'
                """, Integer.class, newcomer.actor().id())).isEqualTo(2);

        UUID nextRequest = insertRequest(createActor("customer"), "searching", null);
        matchingDispatch.match(nextRequest);

        assertThat(pendingOfferProvider(nextRequest)).isEqualTo(newcomer.actor().id());
        assertThat(jdbc.queryForObject("""
                SELECT consecutive_skips FROM public.provider_dispatch_stats
                WHERE provider_id = ? AND service_code = 'flat_tire'
                """, Integer.class, newcomer.actor().id())).isZero();
    }

    @Test
    void expiryDoesNotStarveBehindOneHundredUnexpiredRequests() {
        transactions.executeWithoutResult(status -> {
            UUID teamId = createTeam();
            ProviderFixture provider = createProvider(teamId, PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
            for (int index = 0; index < 101; index++) {
                insertRequest(createActor("customer"), "offered", null);
            }
            jdbc.update("""
                    INSERT INTO public.dispatch_offers(
                      request_id, provider_id, team_id, road_distance_m, eta_seconds, expires_at)
                    SELECT id, ?, ?, 1000, 300, NOW() + INTERVAL '30 minutes'
                    FROM public.rescue_requests
                    """, provider.actor().id(), teamId);
        });
        UUID expiredRequest = jdbc.queryForObject(
                "SELECT id FROM public.rescue_requests ORDER BY id DESC LIMIT 1", UUID.class);
        jdbc.update("""
                UPDATE public.dispatch_offers
                SET offered_at = NOW() - INTERVAL '2 minutes', expires_at = NOW() - INTERVAL '1 minute'
                WHERE request_id = ?
                """, expiredRequest);

        matchingDispatch.expireOffers();
        matchingDispatch.expireOffers();

        assertThat(jdbc.queryForObject("SELECT status FROM public.rescue_requests WHERE id = ?",
                String.class, expiredRequest)).isEqualTo("no_provider");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM public.dispatch_offers WHERE status = 'pending'",
                Integer.class)).isEqualTo(100);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM public.dispatch_offers WHERE status = 'expired'",
                Integer.class)).isEqualTo(1);
        UUID customer = jdbc.queryForObject("SELECT customer_id FROM public.rescue_requests WHERE id = ?",
                UUID.class, expiredRequest);
        verify(push, times(1)).notifyUser(customer, NotificationKind.NO_PROVIDER, null, expiredRequest);
    }

    @Test
    @Timeout(30)
    void sequentialDispatchCreatesOneOfferAndDatabaseRejectsConcurrentLegacyAccepts() throws Exception {
        Actor customer = createActor("customer");
        UUID teamId = createTeam();
        addCapability(teamId);
        ProviderFixture first = createProvider(
                teamId, PICKUP_LATITUDE + 0.001, PICKUP_LONGITUDE + 0.001, 20, true);
        ProviderFixture second = createProvider(
                teamId, PICKUP_LATITUDE + 0.002, PICKUP_LONGITUDE + 0.002, 20, true);
        stubSuccessfulRoutes();
        UUID requestId = insertRequest(customer, "searching", null);
        matchingDispatch.match(requestId);

        UUID initiallyOfferedProvider = pendingOfferProvider(requestId);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.dispatch_offers
                WHERE request_id = ? AND status = 'pending'
                """, Integer.class, requestId)).isEqualTo(1);

        ProviderFixture otherProvider = initiallyOfferedProvider.equals(first.actor().id()) ? second : first;
        jdbc.update("""
                INSERT INTO public.dispatch_offers(
                  request_id, provider_id, team_id, road_distance_m, eta_seconds, expires_at)
                VALUES (?, ?, ?, 1200, 360, NOW() + INTERVAL '1 minute')
                """, requestId, otherProvider.actor().id(), teamId);

        Map<UUID, UUID> offerByProvider = jdbc.query("""
                SELECT provider_id, id FROM public.dispatch_offers WHERE request_id = ?
                """, rs -> {
            Map<UUID, UUID> offers = new HashMap<>();
            while (rs.next()) {
                offers.put(rs.getObject("provider_id", UUID.class), rs.getObject("id", UUID.class));
            }
            return offers;
        }, requestId);
        assertThat(offerByProvider).hasSize(2);
        int expectedVersion = jdbc.queryForObject(
                "SELECT version FROM public.rescue_requests WHERE id = ?", Integer.class, requestId);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Acceptance> firstResult = executor.submit(
                    () -> acceptAfterSignal(first.actor(), offerByProvider.get(first.actor().id()),
                            expectedVersion, ready, start));
            Future<Acceptance> secondResult = executor.submit(
                    () -> acceptAfterSignal(second.actor(), offerByProvider.get(second.actor().id()),
                            expectedVersion, ready, start));
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<Acceptance> results = List.of(
                    firstResult.get(15, TimeUnit.SECONDS),
                    secondResult.get(15, TimeUnit.SECONDS));
            List<Acceptance> successes = results.stream().filter(Acceptance::success).toList();
            List<Acceptance> conflicts = results.stream().filter(result -> !result.success()).toList();

            assertThat(successes).hasSize(1);
            assertThat(conflicts).hasSize(1);
            assertThat(conflicts.get(0).errorCode()).isEqualTo("OFFER_NOT_AVAILABLE");
            UUID winner = successes.get(0).providerId();
            UUID loser = winner.equals(first.actor().id()) ? second.actor().id() : first.actor().id();

            Map<String, Object> assigned = jdbc.queryForMap("""
                    SELECT status, assigned_provider_id, assigned_team_id, version
                    FROM public.rescue_requests WHERE id = ?
                    """, requestId);
            assertThat(assigned.get("status")).isEqualTo("assigned");
            assertThat(assigned.get("assigned_provider_id")).isEqualTo(winner);
            assertThat(assigned.get("assigned_team_id")).isEqualTo(teamId);
            assertThat(((Number) assigned.get("version")).intValue()).isEqualTo(expectedVersion + 1);
            assertThat(jdbc.queryForObject("""
                    SELECT COUNT(*) FROM public.dispatch_offers
                    WHERE request_id = ? AND status = 'accepted'
                    """, Integer.class, requestId)).isEqualTo(1);
            assertThat(jdbc.queryForObject("""
                    SELECT COUNT(*) FROM public.dispatch_offers
                    WHERE request_id = ? AND status = 'withdrawn'
                    """, Integer.class, requestId)).isEqualTo(1);
            assertThat(jdbc.queryForObject(
                    "SELECT is_available FROM public.provider_members WHERE user_id = ?",
                    Boolean.class, winner)).isFalse();
            assertThat(jdbc.queryForObject(
                    "SELECT is_available FROM public.provider_members WHERE user_id = ?",
                    Boolean.class, loser)).isTrue();
            assertThat(jdbc.queryForObject(
                    "SELECT COUNT(*) FROM public.audit_logs WHERE action = 'offer.accepted'",
                    Integer.class)).isEqualTo(1);
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void authenticatedRoleCanOnlySeeAndUpdateItsOwnProfileThroughRls() throws Exception {
        Actor first = createActor("customer");
        Actor second = createActor("customer");

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.execute("SET LOCAL ROLE authenticated");
            }
            try (PreparedStatement claim = connection.prepareStatement(
                    "SELECT set_config('request.jwt.claim.sub', ?, TRUE)")) {
                claim.setString(1, first.id().toString());
                claim.executeQuery().close();
            }

            List<UUID> visible = new ArrayList<>();
            try (Statement statement = connection.createStatement();
                    ResultSet rows = statement.executeQuery("SELECT id FROM public.profiles ORDER BY id")) {
                while (rows.next()) visible.add(rows.getObject(1, UUID.class));
            }
            assertThat(visible).containsExactly(first.id());

            try (PreparedStatement updateOther = connection.prepareStatement(
                    "UPDATE public.profiles SET display_name = 'Blocked' WHERE id = ?")) {
                updateOther.setObject(1, second.id());
                assertThat(updateOther.executeUpdate()).isZero();
            }
            try (PreparedStatement updateOwn = connection.prepareStatement(
                    "UPDATE public.profiles SET display_name = 'Allowed' WHERE id = ?")) {
                updateOwn.setObject(1, first.id());
                assertThat(updateOwn.executeUpdate()).isEqualTo(1);
            }
            connection.rollback();
        }
    }

    @Test
    void assignmentRouteUsesFixedPositionEvenAfterProviderMovesAndGpsAges() {
        Actor customer = createActor("customer");
        ProviderFixture provider = createProvider(createTeam(), 16.06, 108.21, 20, true);
        UUID requestId = insertRequest(customer, "assigned", provider);
        var queries = new RescueQueryService(runtimeJdbc, routing, rescuePolicy, matchingPolicy,
                new RescueRequestAccess(runtimeJdbc));
        var captured = queries.details(customer, requestId).providerLocation();
        assertThat(captured).isNotNull();
        assertThat(captured.latitude()).isEqualTo(16.06);
        assertThat(queries.details(customer, requestId).providerLocationStatus()).isEqualTo("snapshot");

        jdbc.update("UPDATE public.provider_members SET last_latitude = 16.09, last_longitude = 108.24 WHERE user_id = ?",
                provider.actor().id());
        jdbc.update("UPDATE public.rescue_requests SET assigned_provider_position_at = NOW() - INTERVAL '2 hours' WHERE id = ?",
                requestId);
        jdbc.update("UPDATE public.rescue_requests SET status = 'en_route' WHERE id = ?", requestId);
        assertThat(queries.details(customer, requestId).providerLocation().latitude()).isEqualTo(16.06);
        assertThat(queries.details(customer, requestId).providerLocationStatus()).isEqualTo("snapshot");
        when(routing.routeWithGeometry(16.06, 108.21, PICKUP_LATITUDE, PICKUP_LONGITUDE))
                .thenReturn(Optional.of(new RoadRoute(1800, 360, List.of(
                        new RoadPoint(16.06, 108.21), new RoadPoint(PICKUP_LATITUDE, PICKUP_LONGITUDE)))));
        var route = queries.roadRoute(customer, requestId);
        assertThat(route.distanceMeters()).isEqualTo(1800);
        assertThat(route.coordinates()).hasSize(2);
        verify(routing).routeWithGeometry(16.06, 108.21, PICKUP_LATITUDE, PICKUP_LONGITUDE);
        assertApiCode("REQUEST_ACCESS_DENIED", () -> queries.roadRoute(createActor("customer"), requestId));

        jdbc.update("UPDATE public.rescue_requests SET status = 'cancelled', cancellation_reason = 'test' WHERE id = ?", requestId);
        assertThat(queries.details(customer, requestId).providerLocation()).isNull();
        assertThat(jdbc.queryForObject("SELECT assigned_provider_latitude FROM public.rescue_requests WHERE id = ?",
                Double.class, requestId)).isNull();
        assertApiCode("ROUTE_NOT_ACTIVE", () -> queries.roadRoute(customer, requestId));
    }

    @Test
    void reassigningProviderReplacesSnapshotAndMissingSnapshotIsNotFabricated() {
        Actor customer = createActor("customer");
        UUID team = createTeam();
        ProviderFixture first = createProvider(team, 16.06, 108.21, 20, true);
        ProviderFixture second = createProvider(team, 16.07, 108.22, 20, true);
        UUID requestId = insertRequest(customer, "assigned", first);
        var queries = new RescueQueryService(runtimeJdbc, routing, rescuePolicy, matchingPolicy,
                new RescueRequestAccess(runtimeJdbc));
        jdbc.update("UPDATE public.rescue_requests SET assigned_provider_id = ? WHERE id = ?", second.actor().id(), requestId);
        assertThat(queries.details(customer, requestId).providerLocation().latitude()).isEqualTo(16.07);
        jdbc.update("UPDATE public.rescue_requests SET assigned_provider_position_at = NULL WHERE id = ?", requestId);
        assertThat(queries.details(customer, requestId).providerLocation()).isNull();
        assertApiCode("PROVIDER_LOCATION_PENDING", () -> queries.roadRoute(customer, requestId));
    }

    @Test
    void retiredLiveGpsIsRejectedWhileAvailabilityGpsStillWorks() {
        ProviderFixture provider = createProvider(createTeam(), 16.06, 108.21, 20, true);
        providers.saveAvailabilityLocation(provider.actor(), new ProviderLocationRequest(16.07, 108.22, 15.0));
        UUID requestId = insertRequest(createActor("customer"), "assigned", provider);
        assertApiCode("LOCATION_NOT_ALLOWED", () -> providers.saveLocation(provider.actor(), requestId,
                new ProviderLocationRequest(16.08, 108.23, 15.0)));
        assertThat(count("public.provider_location_checkpoints")).isZero();
        assertThat(jdbc.queryForObject("SELECT public.can_access_realtime_topic(?, TRUE)",
                Boolean.class, "rescue:" + requestId)).isFalse();
        assertThat(jdbc.queryForObject("SELECT public.can_access_realtime_topic(?, FALSE)",
                Boolean.class, "rescue:" + requestId)).isFalse();
    }

    private RescueCreationService creationService() {
        return new RescueCreationService(
                runtimeJdbc, runtimeTransactions, creationDispatch, new ServiceAreaService(runtimeJdbc),
                new AuditService(runtimeJdbc), rescuePolicy, new RescueRequestAccess(runtimeJdbc));
    }

    private RescueLifecycleService lifecycleService() {
        return new RescueLifecycleService(
                runtimeJdbc, runtimeTransactions, matchingDispatch, new RequestStateMachine(),
                new ServiceAreaService(runtimeJdbc), new AuditService(runtimeJdbc),
                new CaseLifecycleProperties(null, null, null, null, null, null, null, 3),
                new RescueRequestAccess(runtimeJdbc), new RescueNotificationService(runtimeJdbc, push));
    }

    @Test
    void operatorVerificationUsesRealTriggerAndKeepsIncidentAlertOpen() {
        Actor customer = createActor("customer");
        Actor admin = createActor("admin");
        ProviderFixture provider = createProvider(createTeam(), PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
        UUID requestId = awaitingCompletion(customer, provider);
        jdbc.update("INSERT INTO public.case_attention_flags(request_id, code) VALUES (?, 'completion_confirmation_overdue'), (?, 'customer_incident_reported')",
                requestId, requestId);
        int version = requestVersion(requestId);
        operatorResolutionService().resolve(admin, requestId,
                new com.danang.motorescue.model.ApiModels.CaseResolutionRequest("verified_completed", "Đã xác minh với khách và cứu hộ viên.", version));
        var row = jdbc.queryForMap("SELECT status, version, completed_at FROM public.rescue_requests WHERE id = ?", requestId);
        assertThat(row.get("status")).isEqualTo("completed");
        assertThat(row.get("version")).isEqualTo(version + 1);
        assertThat(row.get("completed_at")).isNotNull();
        assertThat(jdbc.queryForObject("SELECT actor_id FROM public.request_status_events WHERE request_id = ? AND to_status = 'completed'", UUID.class, requestId)).isEqualTo(admin.id());
        assertThat(jdbc.queryForObject("SELECT is_available FROM public.provider_members WHERE user_id = ?", Boolean.class, provider.actor().id())).isFalse();
        assertThat(jdbc.queryForObject("SELECT last_latitude FROM public.provider_members WHERE user_id = ?", Double.class, provider.actor().id())).isNull();
        assertThat(jdbc.queryForList("SELECT code FROM public.case_attention_flags WHERE request_id = ? AND status = 'open'", String.class, requestId)).containsExactly("customer_incident_reported");
        assertThat(jdbc.queryForObject("SELECT metadata->>'decision' FROM public.audit_logs WHERE entity_id = ? AND action = 'request.operator_resolution'", String.class, requestId.toString())).isEqualTo("verified_completed");
        // The active-provider uniqueness constraint no longer blocks a subsequent job.
        providers.setAvailability(provider.actor(), new AvailabilityRequest(true, PICKUP_LATITUDE, PICKUP_LONGITUDE, 20.0));
        insertRequest(createActor("customer"), "assigned", provider);
    }

    @Test
    void unverifiedPreservesTimerVersionAndOpenAlertThenCustomerCanComplete() {
        Actor customer = createActor("customer");
        Actor admin = createActor("admin");
        ProviderFixture provider = createProvider(createTeam(), PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
        UUID requestId = awaitingCompletion(customer, provider);
        jdbc.update("INSERT INTO public.case_attention_flags(request_id, code) VALUES (?, 'completion_confirmation_overdue')", requestId);
        var before = jdbc.queryForMap("SELECT status, version, updated_at FROM public.rescue_requests WHERE id = ?", requestId);
        var input = new com.danang.motorescue.model.ApiModels.CaseResolutionRequest("unverified", "Chưa liên hệ được khách để xác minh.", requestVersion(requestId));
        operatorResolutionService().resolve(admin, requestId, input);
        assertThat(jdbc.queryForMap("SELECT status, version, updated_at FROM public.rescue_requests WHERE id = ?", requestId)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT status FROM public.case_attention_flags WHERE request_id = ?", String.class, requestId)).isEqualTo("open");
        lifecycleService().act(customer, requestId, new StateActionRequest("confirm_completion", null, null, null, input.expectedVersion()));
        assertThat(jdbc.queryForObject("SELECT status FROM public.case_attention_flags WHERE request_id = ?", String.class, requestId)).isEqualTo("resolved");
        assertApiCode("REQUEST_VERSION_CONFLICT", () -> operatorResolutionService().resolve(admin, requestId, input));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM public.audit_logs WHERE action = 'request.operator_resolution'", Integer.class)).isEqualTo(1);
    }

    @Test
    void completionAlertCannotBeDismissedWhileJobIsOpen() {
        var provider = createProvider(createTeam(), PICKUP_LATITUDE, PICKUP_LONGITUDE, 20, true);
        UUID requestId = awaitingCompletion(createActor("customer"), provider);
        UUID flag = jdbc.queryForObject("INSERT INTO public.case_attention_flags(request_id, code) VALUES (?, 'completion_confirmation_overdue') RETURNING id", UUID.class, requestId);
        var operator = new OperatorService(runtimeJdbc, matchingDispatch, new AuditService(runtimeJdbc), runtimeTransactions, qualityPolicy);
        assertApiCode("CASE_RESOLUTION_REQUIRED", () -> operator.resolveAttention(createActor("admin"), flag,
                new com.danang.motorescue.model.ApiModels.AttentionResolutionRequest("Không được ẩn ca chưa kết thúc.")));
        assertThat(jdbc.queryForObject("SELECT status FROM public.case_attention_flags WHERE id = ?", String.class, flag)).isEqualTo("open");
    }

    private OperatorCaseResolutionService operatorResolutionService() {
        return new OperatorCaseResolutionService(runtimeJdbc, runtimeTransactions,
                new RescueRequestAccess(runtimeJdbc), new RescueNotificationService(runtimeJdbc, push));
    }

    private UUID awaitingCompletion(Actor customer, ProviderFixture provider) {
        UUID requestId = insertRequest(customer, "diagnosing", provider);
        jdbc.update("UPDATE public.rescue_requests SET work_type = 'repair', status = 'repairing' WHERE id = ?", requestId);
        jdbc.update("UPDATE public.rescue_requests SET status = 'awaiting_completion' WHERE id = ?", requestId);
        return requestId;
    }

    private int requestVersion(UUID requestId) {
        return jdbc.queryForObject("SELECT version FROM public.rescue_requests WHERE id = ?", Integer.class, requestId);
    }

    @Test
    void committedSearchingCaseIsRecoveredWithoutOriginalProcess() {
        UUID requestId = creationService().create(createActor("customer"), UUID.randomUUID(), validCreateRequest("Test"));
        assertThat(count("public.dispatch_recovery_jobs")).isEqualTo(1);
        jdbc.update("UPDATE public.dispatch_recovery_jobs SET available_at = NOW() - INTERVAL '1 second'");
        new DispatchRecoveryJob(runtimeJdbc, matchingDispatch).recover();
        assertThat(jdbc.queryForObject("SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId))
                .isEqualTo("no_provider");
        assertThat(count("public.dispatch_recovery_jobs")).isZero();
    }

    @Test
    void recoveryJobRollsBackWithRequestAndRetriesAfterExpiredLease() {
        Actor customer = createActor("customer");
        transactions.executeWithoutResult(status -> {
            insertRequest(customer, "searching", null);
            assertThat(count("public.dispatch_recovery_jobs")).isEqualTo(1);
            status.setRollbackOnly();
        });
        assertThat(count("public.dispatch_recovery_jobs")).isZero();
        UUID requestId = insertRequest(customer, "searching", null);
        jdbc.update("UPDATE public.dispatch_recovery_jobs SET available_at = NOW() + INTERVAL '2 minutes', lease_id = ?",
                UUID.randomUUID());
        var job = new DispatchRecoveryJob(runtimeJdbc, matchingDispatch);
        job.recover();
        assertThat(count("public.dispatch_recovery_jobs")).isEqualTo(1);
        jdbc.update("UPDATE public.dispatch_recovery_jobs SET available_at = NOW() - INTERVAL '1 second'");
        job.recover();
        assertThat(count("public.dispatch_recovery_jobs")).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM public.rescue_requests WHERE id = ?", String.class, requestId))
                .isEqualTo("no_provider");
    }

    @Test
    void failedRecoveryKeepsWorkForRetryAndClosedRequestRemovesIt() {
        UUID requestId = insertRequest(createActor("customer"), "searching", null);
        jdbc.update("UPDATE public.dispatch_recovery_jobs SET available_at = NOW() - INTERVAL '1 second'");
        org.mockito.Mockito.doThrow(new IllegalStateException("private diagnostic"))
                .when(creationDispatch).match(requestId);
        new DispatchRecoveryJob(runtimeJdbc, creationDispatch).recover();
        assertThat(jdbc.queryForObject("SELECT attempts FROM public.dispatch_recovery_jobs", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT last_error_type FROM public.dispatch_recovery_jobs", String.class))
                .isEqualTo("IllegalStateException");
        jdbc.update("UPDATE public.rescue_requests SET status = 'cancelled', cancellation_reason = 'test' WHERE id = ?", requestId);
        assertThat(count("public.dispatch_recovery_jobs")).isZero();
    }

    private void stubSuccessfulRoutes() {
        when(routing.routesToDestination(anyList(), any())).thenAnswer(invocation -> {
            List<?> origins = invocation.getArgument(0);
            return origins.stream()
                    .map(ignored -> Optional.of(new RoadRoute(1_000, 300, List.of())))
                    .toList();
        });
    }

    private Acceptance acceptAfterSignal(
            Actor actor,
            UUID offerId,
            int expectedVersion,
            CountDownLatch ready,
            CountDownLatch start) throws Exception {
        ready.countDown();
        if (!start.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Concurrent accept start signal timed out");
        }
        try {
            UUID acceptedRequest = providers.accept(actor, offerId, expectedVersion);
            return new Acceptance(actor.id(), true, acceptedRequest, null);
        } catch (ApiException exception) {
            return new Acceptance(actor.id(), false, null, exception.code());
        }
    }

    private Actor createActor(String role) {
        int sequence = FIXTURE_SEQUENCE.incrementAndGet();
        UUID id = UUID.randomUUID();
        String displayName = "Integration " + sequence;
        jdbc.update("""
                INSERT INTO auth.users(id, phone, raw_user_meta_data)
                VALUES (?, ?, CAST(? AS JSONB))
                """, id, String.format("+849%08d", sequence),
                "{\"display_name\":\"" + displayName + "\"}");
        jdbc.update("UPDATE public.profiles SET role = ? WHERE id = ?", role, id);
        return new Actor(id, displayName, role, "vi");
    }

    private UUID createTeam() {
        int sequence = FIXTURE_SEQUENCE.incrementAndGet();
        UUID teamId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO public.rescue_teams(
                  id, name, partner_reference, status, hotline,
                  base_latitude, base_longitude, service_radius_km, verified_at)
                VALUES (?, ?, ?, 'verified', '+84912345678', ?, ?, 15, NOW())
                """, teamId, "Integration Team " + sequence,
                "INT-" + teamId.toString().substring(0, 8).toUpperCase(),
                PICKUP_LATITUDE, PICKUP_LONGITUDE);
        return teamId;
    }

    private void addCapability(UUID teamId) {
        jdbc.update("""
                INSERT INTO public.team_capabilities(team_id, service_code)
                VALUES (?, 'flat_tire')
                """, teamId);
    }

    private ProviderFixture createProvider(
            UUID teamId,
            double latitude,
            double longitude,
            double accuracy,
            boolean available) {
        Actor actor = createActor("provider");
        int sequence = FIXTURE_SEQUENCE.incrementAndGet();
        jdbc.update("""
                INSERT INTO public.provider_members(
                  user_id, team_id, display_name, contact_phone_e164, status,
                  is_available, last_latitude, last_longitude, location_accuracy_m)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
                """, actor.id(), teamId, actor.displayName(),
                String.format("+848%08d", sequence), available,
                latitude, longitude, accuracy);
        return new ProviderFixture(actor, teamId);
    }

    private void insertCompletedExperience(ProviderFixture provider, String serviceCode) {
        Actor customer = createActor("customer");
        jdbc.update("""
                INSERT INTO public.rescue_requests(
                  id, customer_id, service_code, idempotency_key, status,
                  vehicle_power_type, pickup_area_label,
                  pickup_latitude, pickup_longitude, pickup_source,
                  pickup_accuracy_m, safety_acknowledged,
                  assigned_team_id, assigned_provider_id, work_type, completed_at)
                VALUES (?, ?, ?, ?, 'completed', 'gasoline', 'Hải Châu',
                        ?, ?, 'gps', 20, TRUE, ?, ?, 'repair', NOW())
                """, UUID.randomUUID(), customer.id(), serviceCode, UUID.randomUUID(),
                PICKUP_LATITUDE, PICKUP_LONGITUDE, provider.teamId(), provider.actor().id());
    }

    private UUID pendingOfferProvider(UUID requestId) {
        return jdbc.queryForObject("""
                SELECT provider_id FROM public.dispatch_offers
                WHERE request_id = ? AND status = 'pending'
                """, UUID.class, requestId);
    }

    private void closeUnacceptedRequest(UUID requestId) {
        jdbc.update("""
                UPDATE public.dispatch_offers
                SET status = 'withdrawn'
                WHERE request_id = ? AND status = 'pending'
                """, requestId);
        jdbc.update("""
                UPDATE public.rescue_requests
                SET status = 'no_provider'
                WHERE id = ? AND status = 'offered'
                """, requestId);
    }

    private UUID insertRequest(Actor customer, String status, ProviderFixture assignedProvider) {
        UUID requestId = UUID.randomUUID();
        if (assignedProvider == null) {
            jdbc.update("""
                    INSERT INTO public.rescue_requests(
                      id, customer_id, service_code, idempotency_key, status,
                      vehicle_power_type, pickup_area_label,
                      pickup_latitude, pickup_longitude, pickup_source,
                      pickup_accuracy_m, safety_acknowledged)
                    VALUES (?, ?, 'flat_tire', ?, ?, 'gasoline', 'Hải Châu', ?, ?, 'gps', 20, TRUE)
                    """, requestId, customer.id(), UUID.randomUUID(), status,
                    PICKUP_LATITUDE, PICKUP_LONGITUDE);
        } else {
            jdbc.update("""
                    INSERT INTO public.rescue_requests(
                      id, customer_id, service_code, idempotency_key, status,
                      vehicle_power_type, pickup_area_label,
                      pickup_latitude, pickup_longitude, pickup_source,
                      pickup_accuracy_m, safety_acknowledged,
                      assigned_team_id, assigned_provider_id)
                    VALUES (?, ?, 'flat_tire', ?, ?, 'gasoline', 'Hải Châu', ?, ?, 'gps', 20, TRUE, ?, ?)
                    """, requestId, customer.id(), UUID.randomUUID(), status,
                    PICKUP_LATITUDE, PICKUP_LONGITUDE,
                    assignedProvider.teamId(), assignedProvider.actor().id());
        }
        return requestId;
    }

    private CreateRequest validCreateRequest(String vehicleDescription) {
        return new CreateRequest(
                "flat_tire", "gasoline", vehicleDescription,
                "Hải Châu", "Trước cổng chính",
                PICKUP_LATITUDE, PICKUP_LONGITUDE, "gps", 20.0,
                null, null, null, null,
                false, false, true);
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    private void assertApiCode(String expectedCode, ThrowingCallable operation) {
        assertThatThrownBy(operation)
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.code()).isEqualTo(expectedCode));
    }

    private record ProviderFixture(Actor actor, UUID teamId) {}

    private record Acceptance(UUID providerId, boolean success, UUID requestId, String errorCode) {}
}

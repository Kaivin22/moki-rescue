package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.danang.motorescue.model.ApiModels.CancelRequest;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.model.ApiModels.DestinationRequest;
import com.danang.motorescue.model.ApiModels.IncidentReportRequest;
import com.danang.motorescue.model.ApiModels.QuoteDecisionRequest;
import com.danang.motorescue.model.ApiModels.QuoteRequest;
import com.danang.motorescue.model.ApiModels.RequestCard;
import com.danang.motorescue.model.ApiModels.RequestDetails;
import com.danang.motorescue.model.ApiModels.ReviewRequest;
import com.danang.motorescue.model.ApiModels.RoadRouteResponse;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.model.ApiModels.SupportRequest;
import com.danang.motorescue.service.ActorService.Actor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RescueServiceTest {
    private final Actor actor = new Actor(UUID.randomUUID(), "Test", "customer", "vi");
    private final UUID requestId = UUID.randomUUID();
    private final List<String> calls = new ArrayList<>();
    private RecordingCreationService creation;
    private RecordingQueryService query;
    private RecordingCancellationService cancellation;
    private RecordingLifecycleService lifecycle;
    private RecordingQuoteService quotes;
    private RecordingReviewService reviews;
    private RecordingIncidentService incidents;
    private RescueService rescue;

    @BeforeEach
    void setUp() {
        creation = new RecordingCreationService(calls, requestId);
        query = new RecordingQueryService(calls);
        cancellation = new RecordingCancellationService(calls);
        lifecycle = new RecordingLifecycleService(calls);
        quotes = new RecordingQuoteService(calls);
        reviews = new RecordingReviewService(calls);
        incidents = new RecordingIncidentService(calls);
        rescue = new RescueService(creation, query, cancellation, lifecycle, quotes, reviews, incidents);
    }

    @Test
    void createDelegatesMutationBeforeLoadingTheResponse() {
        UUID idempotencyKey = UUID.randomUUID();

        assertThat(rescue.create(actor, idempotencyKey, null)).isNull();
        assertThat(creation.actor).isEqualTo(actor);
        assertThat(creation.idempotencyKey).isEqualTo(idempotencyKey);
        assertThat(calls).containsExactly("create", "details");
    }

    @Test
    void delegatesEveryReadUseCaseWithoutChangingArguments() {
        Instant before = Instant.now();
        UUID beforeId = UUID.randomUUID();

        assertThat(rescue.list(actor, true, before, beforeId, 25)).isEmpty();
        assertThat(rescue.details(actor, requestId)).isNull();
        assertThat(rescue.roadRoute(actor, requestId)).isNull();

        assertThat(query.history).isTrue();
        assertThat(query.before).isEqualTo(before);
        assertThat(query.beforeId).isEqualTo(beforeId);
        assertThat(query.limit).isEqualTo(25);
        assertThat(calls).containsExactly("list", "details", "roadRoute");
    }

    @Test
    void stateMutationsLoadDetailsOnlyAfterTheUseCaseCompletes() {
        UUID quoteId = UUID.randomUUID();

        assertThat(rescue.cancel(actor, requestId, null)).isNull();
        assertThat(rescue.retryDispatch(actor, requestId)).isNull();
        assertThat(rescue.act(actor, requestId, null)).isNull();
        assertThat(rescue.updateDestination(actor, requestId, null)).isNull();
        assertThat(rescue.submitQuote(actor, requestId, null)).isNull();
        assertThat(rescue.decideQuote(actor, requestId, quoteId, null)).isNull();

        assertThat(quotes.quoteId).isEqualTo(quoteId);
        assertThat(calls).containsExactly(
                "cancel", "details",
                "retryDispatch", "details",
                "act", "details",
                "updateDestination", "details",
                "submitQuote", "details",
                "decideQuote", "details");
    }

    @Test
    void delegatesVoidUseCasesToTheirSingleOwner() {
        rescue.requestSupport(actor, requestId, null);
        rescue.reportIncident(actor, requestId, null);
        rescue.review(actor, requestId, null);
        rescue.deleteReview(actor, requestId);

        assertThat(calls).containsExactly("requestSupport", "reportIncident", "review", "deleteReview");
    }

    private static final class RecordingCreationService extends RescueCreationService {
        private final List<String> calls;
        private final UUID result;
        private Actor actor;
        private UUID idempotencyKey;

        private RecordingCreationService(List<String> calls, UUID result) {
            super(null, null, null, null, null, null, null);
            this.calls = calls;
            this.result = result;
        }

        @Override
        public UUID create(Actor actor, UUID idempotencyKey, CreateRequest input) {
            calls.add("create");
            this.actor = actor;
            this.idempotencyKey = idempotencyKey;
            return result;
        }
    }

    private static final class RecordingQueryService extends RescueQueryService {
        private final List<String> calls;
        private boolean history;
        private Instant before;
        private UUID beforeId;
        private int limit;

        private RecordingQueryService(List<String> calls) {
            super(null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public List<RequestCard> list(
                Actor actor,
                boolean history,
                Instant before,
                UUID beforeId,
                int requestedLimit) {
            calls.add("list");
            this.history = history;
            this.before = before;
            this.beforeId = beforeId;
            this.limit = requestedLimit;
            return List.of();
        }

        @Override
        public RequestDetails details(Actor actor, UUID requestId) {
            calls.add("details");
            return null;
        }

        @Override
        public RoadRouteResponse roadRoute(Actor actor, UUID requestId) {
            calls.add("roadRoute");
            return null;
        }
    }

    private static final class RecordingCancellationService extends RescueCancellationService {
        private final List<String> calls;

        private RecordingCancellationService(List<String> calls) {
            super(null, null, null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public void cancel(Actor actor, UUID requestId, CancelRequest input) {
            calls.add("cancel");
        }
    }

    private static final class RecordingLifecycleService extends RescueLifecycleService {
        private final List<String> calls;

        private RecordingLifecycleService(List<String> calls) {
            super(null, null, null, null, null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public void retryDispatch(Actor actor, UUID requestId) {
            calls.add("retryDispatch");
        }

        @Override
        public void act(Actor actor, UUID requestId, StateActionRequest input) {
            calls.add("act");
        }

        @Override
        public void updateDestination(Actor actor, UUID requestId, DestinationRequest input) {
            calls.add("updateDestination");
        }
    }

    private static final class RecordingQuoteService extends RescueQuoteService {
        private final List<String> calls;
        private UUID quoteId;

        private RecordingQuoteService(List<String> calls) {
            super(null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public void submitQuote(Actor actor, UUID requestId, QuoteRequest input) {
            calls.add("submitQuote");
        }

        @Override
        public void decideQuote(Actor actor, UUID requestId, UUID quoteId, QuoteDecisionRequest input) {
            calls.add("decideQuote");
            this.quoteId = quoteId;
        }
    }

    private static final class RecordingReviewService extends RescueReviewService {
        private final List<String> calls;

        private RecordingReviewService(List<String> calls) {
            super(null, null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public void review(Actor actor, UUID requestId, ReviewRequest input) {
            calls.add("review");
        }

        @Override
        public void deleteReview(Actor actor, UUID requestId) {
            calls.add("deleteReview");
        }
    }

    private static final class RecordingIncidentService extends RescueIncidentService {
        private final List<String> calls;

        private RecordingIncidentService(List<String> calls) {
            super(null, null, null, null, null);
            this.calls = calls;
        }

        @Override
        public void requestSupport(Actor actor, UUID requestId, SupportRequest input) {
            calls.add("requestSupport");
        }

        @Override
        public void reportIncident(Actor actor, UUID requestId, IncidentReportRequest input) {
            calls.add("reportIncident");
        }
    }
}

package com.danang.motorescue.service;

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
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class RescueService {
    private final RescueCreationService creation;
    private final RescueQueryService query;
    private final RescueCancellationService cancellation;
    private final RescueLifecycleService lifecycle;
    private final RescueQuoteService quotes;
    private final RescueReviewService reviews;
    private final RescueIncidentService incidents;

    public RescueService(
            RescueCreationService creation,
            RescueQueryService query,
            RescueCancellationService cancellation,
            RescueLifecycleService lifecycle,
            RescueQuoteService quotes,
            RescueReviewService reviews,
            RescueIncidentService incidents) {
        this.creation = creation;
        this.query = query;
        this.cancellation = cancellation;
        this.lifecycle = lifecycle;
        this.quotes = quotes;
        this.reviews = reviews;
        this.incidents = incidents;
    }

    public RequestDetails create(Actor actor, UUID idempotencyKey, CreateRequest input) {
        UUID requestId = creation.create(actor, idempotencyKey, input);
        return query.details(actor, requestId);
    }

    public List<RequestCard> list(
            Actor actor,
            boolean history,
            Instant before,
            UUID beforeId,
            int requestedLimit) {
        return query.list(actor, history, before, beforeId, requestedLimit);
    }

    public RequestDetails details(Actor actor, UUID requestId) {
        return query.details(actor, requestId);
    }

    public RoadRouteResponse roadRoute(Actor actor, UUID requestId) {
        return query.roadRoute(actor, requestId);
    }

    public RequestDetails cancel(Actor actor, UUID requestId, CancelRequest input) {
        cancellation.cancel(actor, requestId, input);
        return query.details(actor, requestId);
    }

    public RequestDetails retryDispatch(Actor actor, UUID requestId) {
        lifecycle.retryDispatch(actor, requestId);
        return query.details(actor, requestId);
    }

    public void requestSupport(Actor actor, UUID requestId, SupportRequest input) {
        incidents.requestSupport(actor, requestId, input);
    }

    public void reportIncident(Actor actor, UUID requestId, IncidentReportRequest input) {
        incidents.reportIncident(actor, requestId, input);
    }

    public RequestDetails act(Actor actor, UUID requestId, StateActionRequest input) {
        lifecycle.act(actor, requestId, input);
        return query.details(actor, requestId);
    }

    public RequestDetails updateDestination(Actor actor, UUID requestId, DestinationRequest input) {
        lifecycle.updateDestination(actor, requestId, input);
        return query.details(actor, requestId);
    }

    public RequestDetails submitQuote(Actor actor, UUID requestId, QuoteRequest input) {
        quotes.submitQuote(actor, requestId, input);
        return query.details(actor, requestId);
    }

    public RequestDetails decideQuote(
            Actor actor,
            UUID requestId,
            UUID quoteId,
            QuoteDecisionRequest input) {
        quotes.decideQuote(actor, requestId, quoteId, input);
        return query.details(actor, requestId);
    }

    public void review(Actor actor, UUID requestId, ReviewRequest input) {
        reviews.review(actor, requestId, input);
    }

    public void deleteReview(Actor actor, UUID requestId) {
        reviews.deleteReview(actor, requestId);
    }
}

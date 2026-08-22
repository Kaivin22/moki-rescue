package com.danang.motorescue.controller;

import com.danang.motorescue.model.ApiModels.CancelRequest;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.model.ApiModels.QuoteDecisionRequest;
import com.danang.motorescue.model.ApiModels.QuoteRequest;
import com.danang.motorescue.model.ApiModels.RequestCard;
import com.danang.motorescue.model.ApiModels.RequestDetails;
import com.danang.motorescue.model.ApiModels.ReviewRequest;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.model.ApiModels.RoadRouteResponse;
import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.RescueService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/requests")
public class RescueController {
    private final ActorService actors;
    private final RescueService rescue;

    public RescueController(ActorService actors, RescueService rescue) {
        this.actors = actors;
        this.rescue = rescue;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    RequestDetails create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @Valid @RequestBody CreateRequest input) {
        return rescue.create(actors.requireRole(jwt, "customer"), idempotencyKey, input);
    }

    @GetMapping
    List<RequestCard> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean history) {
        return rescue.list(actors.require(jwt), history);
    }

    @GetMapping("/{requestId}")
    RequestDetails details(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        return rescue.details(actors.require(jwt), requestId);
    }

    @GetMapping("/{requestId}/road-route")
    RoadRouteResponse roadRoute(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        return rescue.roadRoute(actors.require(jwt), requestId);
    }

    @PostMapping("/{requestId}/cancel")
    RequestDetails cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody CancelRequest input) {
        return rescue.cancel(actors.require(jwt), requestId, input);
    }

    @PostMapping("/{requestId}/actions")
    RequestDetails action(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody StateActionRequest input) {
        Actor actor = actors.require(jwt);
        return rescue.act(actor, requestId, input);
    }

    @PostMapping("/{requestId}/quotes")
    RequestDetails quote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody QuoteRequest input) {
        return rescue.submitQuote(actors.requireRole(jwt, "provider"), requestId, input);
    }

    @PostMapping("/{requestId}/quotes/{quoteId}/decision")
    RequestDetails decideQuote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @PathVariable UUID quoteId,
            @Valid @RequestBody QuoteDecisionRequest input) {
        return rescue.decideQuote(actors.requireRole(jwt, "customer"), requestId, quoteId, input);
    }

    @PutMapping("/{requestId}/review")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void saveReview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody ReviewRequest input) {
        rescue.review(actors.requireRole(jwt, "customer"), requestId, input);
    }

    @DeleteMapping("/{requestId}/review")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteReview(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        rescue.deleteReview(actors.requireRole(jwt, "customer"), requestId);
    }
}

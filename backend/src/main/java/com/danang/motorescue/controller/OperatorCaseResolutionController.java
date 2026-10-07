package com.danang.motorescue.controller;

import com.danang.motorescue.model.ApiModels.CaseResolutionRequest;
import com.danang.motorescue.model.ApiModels.RequestDetails;
import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.OperatorCaseResolutionService;
import com.danang.motorescue.service.RescueQueryService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operator/requests")
public class OperatorCaseResolutionController {
    private final ActorService actors;
    private final OperatorCaseResolutionService resolutions;
    private final RescueQueryService queries;

    public OperatorCaseResolutionController(ActorService actors, OperatorCaseResolutionService resolutions,
            RescueQueryService queries) {
        this.actors = actors;
        this.resolutions = resolutions;
        this.queries = queries;
    }

    @PostMapping("/{requestId}/resolution")
    RequestDetails resolve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId,
            @Valid @RequestBody CaseResolutionRequest input) {
        var actor = actors.requireRole(jwt, "admin");
        resolutions.resolve(actor, requestId, input);
        return queries.details(actor, requestId);
    }
}

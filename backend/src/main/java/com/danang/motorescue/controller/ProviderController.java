package com.danang.motorescue.controller;

import com.danang.motorescue.model.ApiModels.AvailabilityRequest;
import com.danang.motorescue.model.ApiModels.OfferResponse;
import com.danang.motorescue.model.ApiModels.ProviderLocationRequest;
import com.danang.motorescue.model.ApiModels.ProviderStatusResponse;
import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.ProviderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/provider")
public class ProviderController {
    private final ActorService actors;
    private final ProviderService providers;

    public ProviderController(ActorService actors, ProviderService providers) {
        this.actors = actors;
        this.providers = providers;
    }

    @GetMapping("/status")
    ProviderStatusResponse status(@AuthenticationPrincipal Jwt jwt) {
        return providers.status(provider(jwt));
    }

    @PutMapping("/availability")
    ProviderStatusResponse availability(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AvailabilityRequest input) {
        return providers.setAvailability(provider(jwt), input);
    }

    @GetMapping("/offers")
    List<OfferResponse> offers(@AuthenticationPrincipal Jwt jwt) {
        return providers.offers(provider(jwt));
    }

    @PostMapping("/offers/{offerId}/accept")
    Map<String, UUID> accept(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID offerId,
            @RequestParam @Min(1) int expectedVersion) {
        return Map.of("requestId", providers.accept(provider(jwt), offerId, expectedVersion));
    }

    @PostMapping("/requests/{requestId}/location")
    Map<String, Boolean> location(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody ProviderLocationRequest input) {
        return Map.of("stored", providers.saveLocation(provider(jwt), requestId, input));
    }

    @PostMapping("/location")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void availabilityLocation(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProviderLocationRequest input) {
        providers.saveAvailabilityLocation(provider(jwt), input);
    }

    private Actor provider(Jwt jwt) {
        return actors.requireRole(jwt, "provider");
    }
}

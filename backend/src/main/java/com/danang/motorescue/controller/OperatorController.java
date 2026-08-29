package com.danang.motorescue.controller;

import com.danang.motorescue.model.ApiModels.AccountLookupRequest;
import com.danang.motorescue.model.ApiModels.AccountLookupResponse;
import com.danang.motorescue.model.ApiModels.AddProviderRequest;
import com.danang.motorescue.model.ApiModels.AdminServiceTypeResponse;
import com.danang.motorescue.model.ApiModels.CreateTeamRequest;
import com.danang.motorescue.model.ApiModels.QualityAlertActionRequest;
import com.danang.motorescue.model.ApiModels.QualityReviewResponse;
import com.danang.motorescue.model.ApiModels.ReviewVisibilityRequest;
import com.danang.motorescue.model.ApiModels.StaffRoleRequest;
import com.danang.motorescue.model.ApiModels.TeamCapabilitiesRequest;
import com.danang.motorescue.model.ApiModels.TeamResponse;
import com.danang.motorescue.model.ApiModels.TeamStatusRequest;
import com.danang.motorescue.model.ApiModels.TeamVerificationResponse;
import com.danang.motorescue.model.ApiModels.UpdateServiceTypeRequest;
import com.danang.motorescue.model.ApiModels.UpdateTeamVerificationRequest;
import com.danang.motorescue.model.ApiModels.AttentionFlagResponse;
import com.danang.motorescue.model.ApiModels.AttentionResolutionRequest;
import com.danang.motorescue.model.ApiModels.IncidentResolutionRequest;
import com.danang.motorescue.model.ApiModels.ProviderMemberResponse;
import com.danang.motorescue.model.ApiModels.ProviderMemberStatusRequest;
import com.danang.motorescue.model.ApiModels.AuditLogResponse;
import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.OperatorService;
import com.danang.motorescue.service.QualityService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operator")
public class OperatorController {
    private final ActorService actors;
    private final OperatorService operator;
    private final QualityService quality;

    public OperatorController(ActorService actors, OperatorService operator, QualityService quality) {
        this.actors = actors;
        this.operator = operator;
        this.quality = quality;
    }

    @GetMapping("/teams")
    List<TeamResponse> teams(@AuthenticationPrincipal Jwt jwt) {
        return operator.teams(staff(jwt));
    }

    @PostMapping("/account-lookup")
    AccountLookupResponse lookupAccount(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AccountLookupRequest input) {
        return operator.lookupAccount(staff(jwt), input.phone());
    }

    @PostMapping("/requests/{requestId}/retry")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void retry(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        operator.retry(staff(jwt), requestId);
    }

    @PostMapping("/requests/{requestId}/reassign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reassign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID requestId) {
        operator.reassign(staff(jwt), requestId);
    }

    @GetMapping("/attention")
    List<AttentionFlagResponse> attention(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "true") boolean openOnly) {
        return operator.attentionFlags(staff(jwt), openOnly);
    }

    @PostMapping("/attention/{flagId}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolveAttention(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID flagId,
            @Valid @RequestBody AttentionResolutionRequest input) {
        operator.resolveAttention(staff(jwt), flagId, input);
    }

    @PostMapping("/incidents/{incidentId}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolveIncident(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID incidentId,
            @Valid @RequestBody IncidentResolutionRequest input) {
        operator.resolveIncident(staff(jwt), incidentId, input);
    }

    @GetMapping("/audit-logs")
    List<AuditLogResponse> auditLogs(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Instant before,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "50") int limit) {
        return operator.auditLogs(staff(jwt), before, beforeId, limit);
    }

    @PostMapping("/teams")
    Map<String, UUID> createTeam(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateTeamRequest input) {
        return Map.of("teamId", operator.createTeam(staff(jwt), input));
    }

    @PutMapping("/teams/{teamId}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void setTeamStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId,
            @Valid @RequestBody TeamStatusRequest input) {
        operator.setTeamStatus(staff(jwt), teamId, input.status());
    }

    @GetMapping("/teams/{teamId}/providers")
    List<ProviderMemberResponse> providers(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId) {
        return operator.providers(staff(jwt), teamId);
    }

    @PutMapping("/teams/{teamId}/providers/{providerId}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void setProviderStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId,
            @PathVariable UUID providerId,
            @Valid @RequestBody ProviderMemberStatusRequest input) {
        operator.setProviderStatus(staff(jwt), teamId, providerId, input.status());
    }

    @GetMapping("/teams/{teamId}/verification")
    TeamVerificationResponse teamVerification(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId) {
        return operator.teamVerification(staff(jwt), teamId);
    }

    @PutMapping("/teams/{teamId}/verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void updateTeamVerification(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId,
            @Valid @RequestBody UpdateTeamVerificationRequest input) {
        operator.updateTeamVerification(staff(jwt), teamId, input);
    }

    @PostMapping("/quality-alerts/{alertId}/warn")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void warnQuality(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID alertId,
            @Valid @RequestBody QualityAlertActionRequest input) {
        quality.warn(staff(jwt), alertId, input.note());
    }

    @PostMapping("/quality-alerts/{alertId}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolveQuality(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID alertId,
            @Valid @RequestBody QualityAlertActionRequest input) {
        quality.resolve(staff(jwt), alertId, input.note());
    }

    @GetMapping("/teams/{teamId}/reviews")
    List<QualityReviewResponse> qualityReviews(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId) {
        return quality.reviews(staff(jwt), teamId);
    }

    @PutMapping("/reviews/{reviewId}/visibility")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void setReviewVisibility(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewVisibilityRequest input) {
        quality.setReviewVisibility(staff(jwt), reviewId, input.hidden(), input.note());
    }

    @PutMapping("/teams/{teamId}/capabilities")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void setTeamCapabilities(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId,
            @Valid @RequestBody TeamCapabilitiesRequest input) {
        operator.setTeamCapabilities(staff(jwt), teamId, input.capabilityCodes());
    }

    @PutMapping("/teams/{teamId}/providers")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void addProvider(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID teamId,
            @Valid @RequestBody AddProviderRequest input) {
        operator.addProvider(staff(jwt), teamId, input);
    }

    @PutMapping("/staff-role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void staffRole(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StaffRoleRequest input) {
        operator.setStaffRole(staff(jwt), input);
    }

    @GetMapping("/service-types")
    List<AdminServiceTypeResponse> serviceTypes(@AuthenticationPrincipal Jwt jwt) {
        return operator.serviceTypes(staff(jwt));
    }

    @PutMapping("/service-types/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void updateServiceType(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String code,
            @Valid @RequestBody UpdateServiceTypeRequest input) {
        operator.updateServiceType(staff(jwt), code, input);
    }

    private Actor staff(Jwt jwt) {
        return actors.requireRole(jwt, "dispatcher", "admin");
    }
}

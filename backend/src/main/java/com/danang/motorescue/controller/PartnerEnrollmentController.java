package com.danang.motorescue.controller;

import com.danang.motorescue.service.*;
import com.danang.motorescue.service.PartnerEnrollmentModels.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/partners")
public class PartnerEnrollmentController {
    private final ActorService actors;
    private final PartnerEnrollmentService service;
    public PartnerEnrollmentController(ActorService actors, PartnerEnrollmentService service) {
        this.actors = actors; this.service = service;
    }
    @GetMapping("/applications") List<Application> applications(@AuthenticationPrincipal Jwt jwt) {
        return service.applications(actors.require(jwt));
    }
    @PostMapping("/applications") Map<String,UUID> apply(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Apply input) {
        return Map.of("id", service.apply(actors.require(jwt), input));
    }
    @GetMapping("/checks") List<Check> checks(@AuthenticationPrincipal Jwt jwt) {
        return service.checks(actors.requireRole(jwt, "admin"));
    }
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/applications/{id}/review") void review(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Review input) {
        service.review(actors.requireRole(jwt, "admin"), id, input);
    }
    @GetMapping("/shops") List<Shop> shops(@AuthenticationPrincipal Jwt jwt) { return service.shops(actors.require(jwt)); }
    @GetMapping("/shops/{id}/members") List<Member> members(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.members(actors.require(jwt), id);
    }
    @GetMapping("/shops/{id}/invitations") List<Invitation> sent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.sent(actors.require(jwt), id);
    }
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/shops/{id}/invitations") void invite(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Invite input) {
        service.invite(actors.require(jwt), id, input);
    }
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/shops/{id}/members/{userId}/remove") void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID userId) {
        service.remove(actors.require(jwt), id, userId);
    }
    @GetMapping("/invitations") List<Invitation> inbox(@AuthenticationPrincipal Jwt jwt) { return service.inbox(actors.require(jwt)); }
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/invitations/{id}/answer") void answer(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Answer input) {
        service.answer(actors.require(jwt), id, input.decision());
    }
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PostMapping("/shops/{teamId}/invitations/{id}/revoke") void revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID teamId, @PathVariable UUID id) {
        service.revoke(actors.require(jwt), teamId, id);
    }
}

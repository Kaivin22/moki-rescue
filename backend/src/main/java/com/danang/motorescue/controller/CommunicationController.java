package com.danang.motorescue.controller;

import com.danang.motorescue.service.*;
import com.danang.motorescue.service.CommunicationModels.*;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CommunicationController {
    private final ActorService actors;
    private final InboxService inbox;
    private final SupportTicketService support;
    public CommunicationController(ActorService actors, InboxService inbox, SupportTicketService support) {
        this.actors = actors; this.inbox = inbox; this.support = support;
    }
    @GetMapping("/notifications")
    public Page<Notification> notifications(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "false") boolean unread,
            @RequestParam(required = false) Instant before, @RequestParam(required = false) UUID beforeId,
            @RequestParam(defaultValue = "30") int limit) {
        return inbox.list(actors.require(jwt), unread, before, beforeId, limit);
    }
    @GetMapping("/notifications/unread-count")
    public Count unread(@AuthenticationPrincipal Jwt jwt) { return inbox.unread(actors.require(jwt)); }
    @GetMapping("/notifications/{id}")
    public Notification notification(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return inbox.detail(actors.require(jwt), id); }
    @PostMapping("/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { inbox.read(actors.require(jwt), id); }

    @GetMapping("/support/tickets")
    public Page<Ticket> tickets(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "all") String status,
            @RequestParam(required = false) Instant before, @RequestParam(required = false) UUID beforeId,
            @RequestParam(defaultValue = "30") int limit) {
        return support.list(actors.require(jwt), status, before, beforeId, limit);
    }
    @PostMapping("/support/tickets") @ResponseStatus(HttpStatus.CREATED)
    public Ticket create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateTicket input) { return support.create(actors.require(jwt), input); }
    @GetMapping("/support/tickets/{id}")
    public Ticket ticket(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return support.detail(actors.require(jwt), id); }
    @GetMapping("/support/incidents/{id}")
    public Ticket incident(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return support.forIncident(actors.require(jwt), id); }
    @GetMapping("/support/tickets/{id}/messages")
    public Page<Message> messages(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestParam(required = false) Instant before, @RequestParam(required = false) UUID beforeId,
            @RequestParam(defaultValue = "30") int limit) {
        return support.messages(actors.require(jwt), id, before, beforeId, limit);
    }
    @PostMapping("/support/tickets/{id}/messages") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reply(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody SendMessage input) { support.reply(actors.require(jwt), id, input); }
    @PostMapping("/support/tickets/{id}/status") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody ChangeStatus input) { support.changeStatus(actors.requireRole(jwt, "admin"), id, input); }

    @GetMapping("/operator/announcements")
    public Page<Announcement> announcements(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Instant before, @RequestParam(required = false) UUID beforeId,
            @RequestParam(defaultValue = "30") int limit) {
        return inbox.announcements(actors.requireRole(jwt, "admin"), before, beforeId, limit);
    }
    @GetMapping("/operator/announcements/preview")
    public Count preview(@AuthenticationPrincipal Jwt jwt, @RequestParam String audience) { return inbox.preview(actors.requireRole(jwt, "admin"), audience); }
    @GetMapping("/operator/announcements/{id}")
    public Announcement announcement(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return inbox.announcement(actors.requireRole(jwt, "admin"), id); }
    @PostMapping("/operator/announcements") @ResponseStatus(HttpStatus.CREATED)
    public Announcement publish(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Publish input) { return inbox.publish(actors.requireRole(jwt, "admin"), input); }
}

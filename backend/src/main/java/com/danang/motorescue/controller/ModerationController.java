package com.danang.motorescue.controller;

import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.ModerationQueryService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operator/moderation")
public class ModerationController {
    private final ActorService actors;
    private final ModerationQueryService moderation;
    public ModerationController(ActorService actors, ModerationQueryService moderation) {
        this.actors = actors;
        this.moderation = moderation;
    }
    @GetMapping("/{kind}")
    public ModerationQueryService.Page list(@AuthenticationPrincipal Jwt jwt, @PathVariable String kind,
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(required = false) Instant before, @RequestParam(required = false) UUID beforeId,
            @RequestParam(defaultValue = "30") int limit) {
        return moderation.list(actors.requireRole(jwt, "admin"), kind, status, before, beforeId, limit);
    }
    @GetMapping("/{kind}/{id}")
    public ModerationQueryService.Entry detail(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String kind, @PathVariable UUID id) {
        return moderation.detail(actors.requireRole(jwt, "admin"), kind, id);
    }
}

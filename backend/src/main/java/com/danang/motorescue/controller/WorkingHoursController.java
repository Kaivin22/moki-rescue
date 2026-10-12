package com.danang.motorescue.controller;

import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.WorkingHoursService;
import com.danang.motorescue.service.WorkingHoursService.Schedule;
import com.danang.motorescue.service.WorkingHoursService.Update;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class WorkingHoursController {
    private final ActorService actors;
    private final WorkingHoursService hours;

    public WorkingHoursController(ActorService actors, WorkingHoursService hours) {
        this.actors = actors;
        this.hours = hours;
    }

    @GetMapping("/api/operator/teams/{teamId}/working-hours")
    Schedule read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID teamId) {
        return hours.forAdmin(actors.requireRole(jwt, "admin"), teamId);
    }

    @PutMapping("/api/operator/teams/{teamId}/working-hours")
    Schedule save(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID teamId, @Valid @RequestBody Update input) {
        return hours.save(actors.requireRole(jwt, "admin"), teamId, input);
    }

    @GetMapping("/api/provider/working-hours")
    Schedule own(@AuthenticationPrincipal Jwt jwt) {
        return hours.forProvider(actors.requireRole(jwt, "provider"));
    }
}

package com.danang.motorescue.controller;
import com.danang.motorescue.service.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/requests/history")
public class PersonalHistoryController {
    private final ActorService actors;
    private final PersonalHistoryService history;
    public PersonalHistoryController(ActorService actors, PersonalHistoryService history) { this.actors=actors; this.history=history; }
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT)
    public void all(@AuthenticationPrincipal Jwt jwt) { history.hide(actors.require(jwt), null); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void one(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { history.hide(actors.require(jwt), id); }
}

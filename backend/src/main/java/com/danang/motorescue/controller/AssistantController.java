package com.danang.motorescue.controller;

import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.AssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
    public record MessageRequest(@NotBlank @Size(max = 500) String message) {}

    private final ActorService actors;
    private final AssistantService assistant;

    public AssistantController(ActorService actors, AssistantService assistant) {
        this.actors = actors;
        this.assistant = assistant;
    }

    @PostMapping("/message")
    AssistantService.Reply message(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MessageRequest input) {
        return assistant.answer(actors.require(jwt), input.message().strip());
    }
}

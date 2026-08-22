package com.danang.motorescue.controller;

import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    record HealthResponse(String status, Instant timestamp) {}

    @GetMapping
    HealthResponse health() {
        return new HealthResponse("ok", Instant.now());
    }
}

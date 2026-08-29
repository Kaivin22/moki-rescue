package com.danang.motorescue.controller;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    record HealthResponse(String status, Instant timestamp) {}
    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    HealthResponse health() {
        return new HealthResponse("ok", Instant.now());
    }

    @GetMapping("/ready")
    ResponseEntity<HealthResponse> readiness() {
        try {
            Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
            if (result != null && result == 1) {
                return ResponseEntity.ok(new HealthResponse("ready", Instant.now()));
            }
        } catch (DataAccessException ignored) {
            // A readiness endpoint should expose status, not database details.
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new HealthResponse("not_ready", Instant.now()));
    }
}

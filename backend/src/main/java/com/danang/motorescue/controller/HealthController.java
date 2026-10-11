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
            Integer result = jdbc.queryForObject("""
                    SELECT CASE WHEN
                      to_regprocedure('public.api_is_in_service_area(double precision,double precision)') IS NOT NULL
                      AND to_regclass('public.user_notifications') IS NOT NULL
                      AND to_regclass('public.support_tickets') IS NOT NULL
                      AND to_regclass('public.support_messages') IS NOT NULL
                      AND to_regclass('public.announcements') IS NOT NULL
                      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.service_types')
                        AND conname = 'service_types_gasoline_scope' AND convalidated)
                      AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.team_capabilities')
                        AND conname = 'team_capabilities_gasoline_scope' AND convalidated)
                      AND EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'rescue_teams' AND column_name = 'base_address')
                      AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.incident_reports')
                        AND tgname = 'incident_support_ticket' AND tgenabled IN ('O', 'A'))
                      AND EXISTS (SELECT 1 FROM pg_trigger
                        WHERE tgrelid = to_regclass('public.rescue_requests')
                          AND tgname = 'rescue_requests_service_area' AND tgenabled IN ('O', 'A'))
                      AND EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'provider_members'
                          AND column_name = 'status' AND column_default LIKE '%pending%')
                      AND position('team.base_latitude' IN pg_get_functiondef(
                        to_regprocedure('public.capture_assignment_position()'))) > 0
                      AND position('team.base_latitude' IN pg_get_functiondef(
                        to_regprocedure('public.enforce_assignment_service_area()'))) > 0
                    THEN 1 ELSE 0 END
                    """, Integer.class);
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

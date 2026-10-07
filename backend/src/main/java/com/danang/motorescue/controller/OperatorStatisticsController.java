package com.danang.motorescue.controller;

import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.OperatorStatisticsService;
import com.danang.motorescue.service.OperatorStatisticsService.Statistics;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OperatorStatisticsController {
    private final ActorService actors;
    private final OperatorStatisticsService statistics;
    public OperatorStatisticsController(ActorService actors, OperatorStatisticsService statistics) {
        this.actors = actors;
        this.statistics = statistics;
    }
    @GetMapping("/api/operator/statistics")
    public Statistics statistics(@AuthenticationPrincipal Jwt jwt) {
        return statistics.statistics(actors.requireRole(jwt, "admin"));
    }
}

package com.danang.motorescue.service;

import com.danang.motorescue.web.ApiException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RequestStateMachine {
    private static final Map<String, Map<String, String>> PROVIDER_ACTIONS = Map.ofEntries(
            Map.entry("assigned", Map.of("start_trip", "en_route")),
            Map.entry("en_route", Map.of("request_arrival", "awaiting_arrival_confirmation")),
            Map.entry("arrived", Map.of("start_diagnosis", "diagnosing")),
            Map.entry("repairing", Map.of("request_completion", "awaiting_completion")),
            Map.entry("transporting", Map.of("request_completion", "awaiting_completion"))
    );

    private static final Map<String, Map<String, String>> CUSTOMER_ACTIONS = Map.ofEntries(
            Map.entry("awaiting_arrival_confirmation", Map.of(
                    "confirm_arrival", "arrived", "reject_arrival", "en_route")),
            Map.entry("awaiting_completion", Map.of(
                    "confirm_completion", "completed", "reject_repair", "repairing", "reject_transport", "transporting"))
    );

    public String next(String role, String current, String action) {
        Map<String, Map<String, String>> graph = switch (role) {
            case "provider" -> PROVIDER_ACTIONS;
            case "customer" -> CUSTOMER_ACTIONS;
            default -> throw invalid();
        };
        String next = graph.getOrDefault(current, Map.of()).get(action);
        if (next == null) throw invalid();
        return next;
    }

    private ApiException invalid() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "INVALID_REQUEST_ACTION",
                "Thao tác không phù hợp với trạng thái hiện tại của yêu cầu.");
    }
}

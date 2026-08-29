package com.danang.motorescue.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class ExpoPushProtocol {
    record Ticket(String id, String errorCode) {
        boolean accepted() {
            return id != null;
        }
    }

    record Receipt(boolean delivered, String errorCode) {}

    private ExpoPushProtocol() {}

    static List<Ticket> parseTickets(JsonNode response, int expectedCount) {
        JsonNode data = response == null ? null : response.get("data");
        if (data == null || !data.isArray() || data.size() != expectedCount) {
            throw new IllegalArgumentException("Unexpected Expo push ticket response");
        }
        List<Ticket> tickets = new ArrayList<>(expectedCount);
        for (JsonNode item : data) {
            if ("ok".equals(item.path("status").asText()) && item.hasNonNull("id")) {
                String id = item.path("id").asText();
                if (id.length() < 8 || id.length() > 100) {
                    tickets.add(new Ticket(null, "InvalidTicketId"));
                } else {
                    tickets.add(new Ticket(id, null));
                }
            } else {
                tickets.add(new Ticket(null, errorCode(item)));
            }
        }
        return tickets;
    }

    static Map<String, Receipt> parseReceipts(JsonNode response) {
        JsonNode data = response == null ? null : response.get("data");
        if (data == null || !data.isObject()) {
            throw new IllegalArgumentException("Unexpected Expo push receipt response");
        }
        Map<String, Receipt> receipts = new LinkedHashMap<>();
        data.fieldNames().forEachRemaining(ticketId -> {
            JsonNode value = data.get(ticketId);
            boolean delivered = "ok".equals(value.path("status").asText());
            receipts.put(ticketId, new Receipt(delivered, delivered ? null : errorCode(value)));
        });
        return receipts;
    }

    static boolean deviceNotRegistered(String errorCode) {
        return "DeviceNotRegistered".equals(errorCode);
    }

    private static String errorCode(JsonNode item) {
        String candidate = item.path("details").path("error").asText("UnknownPushError");
        return candidate.matches("^[A-Za-z][A-Za-z0-9_]{1,79}$") ? candidate : "UnknownPushError";
    }
}

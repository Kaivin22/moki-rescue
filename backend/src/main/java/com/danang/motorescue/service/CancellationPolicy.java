package com.danang.motorescue.service;

import com.danang.motorescue.web.ApiException;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class CancellationPolicy {
    private static final Set<String> CUSTOMER_REASONS = Set.of(
            "issue_resolved", "changed_mind", "wrong_location", "duplicate_request",
            "provider_not_present", "other");
    private static final Set<String> OPERATIONS_REASONS = Set.of(
            "provider_unavailable", "safety_issue", "customer_unreachable",
            "duplicate_or_fraud", "other");

    public record Decision(String stage, boolean late, boolean arrivalDisputed) {}

    public Decision evaluate(String role, String status, String reasonCode, String note) {
        String code = reasonCode == null ? "" : reasonCode.trim();
        String cleanNote = note == null ? "" : note.trim();

        if ("customer".equals(role)) {
            if (!CUSTOMER_REASONS.contains(code)) throw invalidReason();
            if ("other".equals(code) && cleanNote.length() < 5) throw reasonNoteRequired();
            return switch (status) {
                case "searching", "offered", "no_provider" -> new Decision("pre_dispatch", false, false);
                case "assigned" -> new Decision("assigned", false, false);
                case "en_route" -> new Decision("en_route", true, false);
                case "awaiting_arrival_confirmation" -> {
                    if (!"provider_not_present".equals(code)) throw invalidReason();
                    yield new Decision("arrival_disputed", true, true);
                }
                default -> throw invalidAction();
            };
        }

        if ("provider".equals(role) || "dispatcher".equals(role) || "admin".equals(role)) {
            if (!OPERATIONS_REASONS.contains(code)) throw invalidReason();
            if (cleanNote.length() < 5) throw reasonNoteRequired();
            return new Decision("operational", false, false);
        }
        throw invalidAction();
    }

    private ApiException invalidReason() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CANCELLATION_REASON",
                "Lý do hủy không hợp lệ với trạng thái hiện tại.");
    }

    private ApiException reasonNoteRequired() {
        return new ApiException(HttpStatus.BAD_REQUEST, "CANCELLATION_NOTE_REQUIRED",
                "Hãy nhập mô tả cụ thể cho lý do đã chọn.");
    }

    private ApiException invalidAction() {
        return new ApiException(HttpStatus.CONFLICT, "INVALID_REQUEST_ACTION",
                "Bạn không thể tự hủy yêu cầu ở trạng thái hiện tại.");
    }
}

package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.CaseResolutionRequest;
import com.danang.motorescue.web.ApiException;
import org.springframework.http.HttpStatus;

final class CaseResolutionPolicy {
    private CaseResolutionPolicy() {}

    static void requireAdmin(String role) {
        if (!"admin".equals(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ROLE_REQUIRED",
                    "Chỉ admin được xác minh kết quả ca ngoại lệ.");
        }
    }

    static void validate(String status, int version, CaseResolutionRequest input) {
        if (input.expectedVersion() == null || input.expectedVersion() != version) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_VERSION_CONFLICT",
                    "Ca đã thay đổi. Hãy tải lại và kiểm tra trước khi quyết định.");
        }
        if (!"awaiting_completion".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_REQUEST_ACTION",
                    "Chỉ xác minh hoàn tất khi cứu hộ viên đã gửi yêu cầu hoàn thành.");
        }
        if (!("verified_completed".equals(input.decision()) || "unverified".equals(input.decision()))
                || input.note() == null || input.note().trim().length() < 10 || input.note().length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CASE_RESOLUTION_INVALID",
                    "Chọn kết quả và ghi căn cứ xác minh từ 10 đến 500 ký tự.");
        }
    }
}

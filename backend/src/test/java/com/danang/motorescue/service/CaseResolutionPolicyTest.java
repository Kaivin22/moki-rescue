package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.model.ApiModels.CaseResolutionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CaseResolutionPolicyTest {
    private CaseResolutionRequest input(String decision, Integer version) {
        return new CaseResolutionRequest(decision, "Đã liên hệ các bên và kiểm tra kết quả công việc.", version);
    }

    @Test
    void onlyAdminCanUseResolutionEvenWhenCallingServiceDirectly() {
        var service = new OperatorCaseResolutionService(null, null, null, null);
        for (String role : List.of("customer", "provider")) {
            assertThatThrownBy(() -> service.resolve(new Actor(UUID.randomUUID(), "Test", role, "vi"),
                    UUID.randomUUID(), input("verified_completed", 3)))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ADMIN_ROLE_REQUIRED"));
        }
        assertThatCode(() -> CaseResolutionPolicy.requireAdmin("admin")).doesNotThrowAnyException();
    }

    @Test
    void acceptsBothExplicitDecisionsOnlyAtCompletionReview() {
        for (String decision : List.of("verified_completed", "unverified")) {
            assertThatCode(() -> CaseResolutionPolicy.validate("awaiting_completion", 3, input(decision, 3)))
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void rejectsBypassingWorkOrReopeningEndedJobs() {
        for (String state : List.of("searching", "assigned", "en_route", "arrived", "diagnosing",
                "awaiting_quote", "quote_approved", "repairing", "transporting", "needs_dispatch", "completed", "cancelled")) {
            assertThatThrownBy(() -> CaseResolutionPolicy.validate(state, 3, input("verified_completed", 3)))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("INVALID_REQUEST_ACTION"));
        }
    }

    @Test
    void rejectsMissingAndStaleVersionForBothDecisions() {
        for (String decision : List.of("verified_completed", "unverified")) {
            for (Integer version : new Integer[] { null, 2, 4 }) {
                assertThatThrownBy(() -> CaseResolutionPolicy.validate("awaiting_completion", 3, input(decision, version)))
                        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("REQUEST_VERSION_CONFLICT"));
            }
        }
    }

    @Test
    void rejectsMissingShortWhitespaceAndOversizedEvidence() {
        for (String note : new String[] { null, "", "          ", "  short  ", "x".repeat(501) }) {
            assertThatThrownBy(() -> CaseResolutionPolicy.validate("awaiting_completion", 3,
                    new CaseResolutionRequest("verified_completed", note, 3)))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("CASE_RESOLUTION_INVALID"));
        }
    }

    @Test
    void rejectsImplicitOrUnknownDecisions() {
        for (String decision : new String[] { null, "completed", "cancelled", "timeout", "" }) {
            assertThatThrownBy(() -> CaseResolutionPolicy.validate("awaiting_completion", 3, input(decision, 3)))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("CASE_RESOLUTION_INVALID"));
        }
    }
}

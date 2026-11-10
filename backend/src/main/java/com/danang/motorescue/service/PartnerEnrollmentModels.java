package com.danang.motorescue.service;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PartnerEnrollmentModels {
    private PartnerEnrollmentModels() {}
    public record Apply(@NotBlank @Size(min=2,max=120) String name,
            @NotBlank @Size(min=5,max=300) String address,
            @NotBlank @Pattern(regexp="^\\+84[0-9]{9}$") String contactPhone,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotEmpty @Size(max=10) List<@NotBlank String> serviceCodes) {}
    public record Review(@NotBlank @Pattern(regexp="approved|rejected") String decision,
            @NotBlank @Size(min=5,max=300) String note, @NotNull List<String> checkedCodes) {}
    public record Invite(@NotBlank @Pattern(regexp="^\\+84[0-9]{9}$") String phone,
            @AssertTrue boolean rosterConfirmed) {}
    public record Answer(@NotBlank @Pattern(regexp="accepted|declined") String decision) {}
    public record Application(UUID id, UUID applicantId, String applicantName, String name, String address,
            String contactPhone, double latitude, double longitude, List<String> serviceCodes,
            String status, UUID teamId, String reviewNote, Instant createdAt) {}
    public record Check(String code, String label, String description) {}
    public record Shop(UUID id, String name, String address, String status) {}
    public record Member(UUID userId, String name, String status, boolean representative) {}
    public record Invitation(UUID id, UUID teamId, String teamName, String inviteeName,
            String status, Instant expiresAt) {}
}

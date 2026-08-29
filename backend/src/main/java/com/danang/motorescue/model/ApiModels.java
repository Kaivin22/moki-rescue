package com.danang.motorescue.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ApiModels {
    private ApiModels() {}

    public record ProfileResponse(UUID id, String displayName, String role, String locale) {}

    public record ServiceTypeResponse(
            String code,
            String label,
            String description,
            String iconName,
            boolean requiresQuote,
            boolean requiresDestination) {}

    public record AdminServiceTypeResponse(
            String code,
            String labelVi,
            String descriptionVi,
            String labelEn,
            String descriptionEn,
            String iconName,
            boolean requiresQuote,
            boolean requiresDestination,
            short sortOrder,
            boolean active) {}

    public record UpdateServiceTypeRequest(
            @NotBlank @Size(min = 2, max = 80) String labelVi,
            @NotBlank @Size(min = 2, max = 300) String descriptionVi,
            @NotBlank @Size(min = 2, max = 80) String labelEn,
            @NotBlank @Size(min = 2, max = 300) String descriptionEn,
            @NotBlank @Pattern(regexp = "^[a-z0-9-]{2,40}$") String iconName,
            boolean requiresQuote,
            boolean requiresDestination,
            @Min(0) @Max(1000) short sortOrder,
            boolean active) {}

    public record CreateRequest(
            @NotBlank @Pattern(regexp = "^[a-z][a-z0-9_]{2,39}$") String serviceCode,
            @NotBlank @Pattern(regexp = "gasoline|electric|unknown") String vehiclePowerType,
            @Size(max = 160) String vehicleDescription,
            @NotBlank @Size(max = 160) String pickupAreaLabel,
            @Size(max = 500) String pickupNote,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotBlank @Pattern(regexp = "gps|manual|geocoded") String pickupSource,
            @DecimalMin("0") @DecimalMax("1000") Double pickupAccuracyM,
            @Size(min = 2, max = 160) String destinationAreaLabel,
            @Size(max = 500) String destinationNote,
            @DecimalMin("-90") @DecimalMax("90") Double destinationLatitude,
            @DecimalMin("-180") @DecimalMax("180") Double destinationLongitude,
            @NotNull Boolean hasInjury,
            @NotNull Boolean hasImmediateHazard,
            boolean safetyAcknowledged) {}

    public record RequestCard(
            UUID id,
            String status,
            String serviceCode,
            String serviceLabel,
            String serviceIcon,
            String pickupAreaLabel,
            Integer etaMinutes,
            boolean attentionRequired,
            int version,
            Instant requestedAt,
            Instant updatedAt) {}

    public record QuoteSummary(
            UUID id,
            short version,
            String description,
            long amountVnd,
            String workType,
            String status,
            Instant createdAt) {}

    public record ReviewSummary(short rating, String comment, Instant updatedAt) {}

    public record RatingSummary(Double average, int count) {}

    public record QualityAlertSummary(
            UUID id,
            String severity,
            String status,
            double averageRating,
            int ratingCount,
            Integer warningNumber,
            Instant createdAt) {}

    public record LocationPoint(double latitude, double longitude, Double accuracyM, Instant recordedAt) {}

    public record RouteCoordinate(double latitude, double longitude) {}

    public record RoadRouteResponse(
            String phase, int distanceMeters, int durationSeconds, List<RouteCoordinate> coordinates) {}

    public record StatusEvent(String fromStatus, String toStatus, Instant createdAt) {}

    public record FeedbackSummary(
            String action, String reasonCode, String note, Instant createdAt) {}

    public record IncidentReportSummary(
            UUID id, String category, String description, String status, Instant createdAt,
            String resolutionNote, Instant resolvedAt) {}

    public record RequestDetails(
            UUID id,
            String status,
            String serviceCode,
            String serviceLabel,
            String serviceIcon,
            boolean serviceRequiresQuote,
            boolean serviceRequiresDestination,
            String vehiclePowerType,
            String vehicleDescription,
            String activeWorkType,
            String pickupAreaLabel,
            String pickupNote,
            double pickupLatitude,
            double pickupLongitude,
            String destinationAreaLabel,
            String destinationNote,
            Double destinationLatitude,
            Double destinationLongitude,
            UUID assignedProviderId,
            String providerName,
            String providerContactPhone,
            String providerTeamName,
            String rescueVehicleLabel,
            Integer roadDistanceM,
            Integer etaMinutes,
            String routingStatus,
            String locationPrecision,
            String cancellationCode,
            String cancellationStage,
            String cancellationReason,
            boolean lateCancellation,
            Boolean providerNearPickupOnCancel,
            int version,
            Instant requestedAt,
            Instant updatedAt,
            RatingSummary providerRating,
            RatingSummary teamRating,
            QuoteSummary currentQuote,
            ReviewSummary review,
            LocationPoint providerLocation,
            String providerLocationStatus,
            List<String> attentionCodes,
            List<FeedbackSummary> feedback,
            List<IncidentReportSummary> incidentReports,
            List<StatusEvent> events) {}

    public record DestinationRequest(
            @NotBlank @Size(max = 160) String areaLabel,
            @Size(max = 500) String note,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @Min(1) int expectedRequestVersion) {}

    public record AvailabilityRequest(
            boolean available,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @DecimalMin("0") @DecimalMax("1000") Double accuracyM) {}

    public record ProviderWithdrawalResponse(UUID requestId, String status) {}

    public record ProviderWithdrawalRequest(@NotBlank @Size(min = 5, max = 300) String reason) {}

    public record ProviderLocationRequest(
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotNull @DecimalMin("0") @DecimalMax("1000") Double accuracyM) {}

    public record OfferResponse(
            UUID id,
            UUID requestId,
            String serviceCode,
            String serviceLabel,
            String pickupAreaLabel,
            String vehiclePowerType,
            int roadDistanceM,
            int etaSeconds,
            int requestVersion,
            Instant expiresAt) {}

    public record StateActionRequest(
            @NotBlank @Pattern(regexp = "^[a-z_]{3,40}$") String action,
            @Pattern(regexp = "repair|transport") String workType,
            @Pattern(regexp = "^[a-z_]{3,40}$") String reasonCode,
            @Size(max = 300) String note,
            @Min(1) Integer expectedVersion) {}

    public record QuoteRequest(
            @NotBlank @Size(max = 500) String description,
            @Min(0) @Max(100_000_000) long amountVnd,
            @NotBlank @Pattern(regexp = "repair|transport") String workType,
            @Min(1) int expectedRequestVersion) {}

    public record QuoteDecisionRequest(
            @NotBlank @Pattern(regexp = "approve|reject") String decision,
            @Min(1) int expectedRequestVersion) {}

    public record CancelRequest(
            @NotBlank @Pattern(regexp = "^[a-z_]{3,40}$") String reasonCode,
            @Size(max = 300) String note,
            @Min(1) int expectedVersion) {}

    public record SupportRequest(
            @NotBlank @Pattern(regexp = "assisted_cancellation|no_provider|provider_contact|safety_concern|other")
            String reasonCode,
            @Size(max = 300) String note) {}

    public record IncidentReportRequest(
            @NotBlank @Pattern(regexp = "provider_conduct|service_quality|safety|property_damage|other")
            String category,
            @NotBlank @Size(min = 10, max = 1000) String description) {}

    public record ReviewRequest(@Min(1) @Max(5) short rating, @Size(max = 1000) String comment) {}

    public record ProviderStatusResponse(
            boolean available,
            String teamName,
            String status,
            RatingSummary teamRating,
            int qualityWarningCount,
            boolean suspensionReviewRecommended,
            String qualityNotice) {}

    public record TeamResponse(
            UUID id,
            String name,
            String status,
            int activeProviders,
            List<String> capabilityCodes,
            RatingSummary rating,
            int qualityWarningCount,
            boolean suspensionReviewRecommended,
            QualityAlertSummary activeQualityAlert) {}

    public record QualityAlertActionRequest(@NotBlank @Size(min = 5, max = 500) String note) {}

    public record QualityReviewResponse(
            UUID id,
            UUID requestId,
            String providerName,
            short rating,
            String comment,
            boolean hidden,
            Instant createdAt,
            Instant updatedAt) {}

    public record AttentionFlagResponse(
            UUID id,
            UUID requestId,
            String serviceLabel,
            String requestStatus,
            String code,
            String contextNote,
            String status,
            Instant detectedAt,
            String resolutionNote,
            Instant resolvedAt) {}

    public record AttentionResolutionRequest(
            @NotBlank @Size(min = 5, max = 500) String note) {}

    public record IncidentResolutionRequest(
            @NotBlank @Pattern(regexp = "resolved|dismissed") String decision,
            @NotBlank @Size(min = 5, max = 500) String note) {}

    public record AuditLogResponse(
            long id, String actorDisplayName, String action, String entityType,
            String entityId, Instant createdAt) {}

    public record ReviewVisibilityRequest(
            @NotNull Boolean hidden,
            @NotBlank @Size(min = 5, max = 500) String note) {}

    public record AccountLookupRequest(
            @NotBlank @Pattern(regexp = "^\\+[1-9][0-9]{7,14}$") String phone) {}

    public record AccountLookupResponse(UUID id, String displayName, String role) {}

    public record CreateTeamRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9._/-]{3,79}$") String contractReference,
            @NotBlank @Pattern(regexp = "^\\+[1-9][0-9]{7,14}$") String hotline,
            @DecimalMin("-90") @DecimalMax("90") Double baseLatitude,
            @DecimalMin("-180") @DecimalMax("180") Double baseLongitude,
            @NotNull @DecimalMin("1") @DecimalMax("100") Double serviceRadiusKm) {}

    public record TeamVerificationCheckResponse(
            String code,
            String labelVi,
            String descriptionVi,
            String labelEn,
            String descriptionEn,
            boolean required,
            boolean completed,
            String note,
            String checkedByName,
            Instant checkedAt) {}

    public record TeamVerificationResponse(
            UUID teamId,
            String teamName,
            String status,
            String contractReference,
            String verifiedByName,
            Instant verifiedAt,
            int activeProviderCount,
            int capabilityCount,
            int completedRequiredCount,
            int requiredCount,
            boolean readyToVerify,
            List<TeamVerificationCheckResponse> checks) {}

    public record TeamVerificationCheckRequest(
            @NotBlank @Pattern(regexp = "^[a-z][a-z0-9_]{2,39}$") String code,
            boolean completed,
            @Size(min = 5, max = 300) String note) {}

    public record UpdateTeamVerificationRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9._/-]{3,79}$") String contractReference,
            @NotNull @Size(min = 1, max = 20) List<@Valid TeamVerificationCheckRequest> checks) {}

    public record TeamStatusRequest(@NotBlank @Pattern(regexp = "pending|verified|suspended") String status) {}

    public record TeamCapabilitiesRequest(
            @NotNull @Size(min = 1, max = 6)
            List<@Pattern(regexp = "^[a-z][a-z0-9_]{2,39}$") String> capabilityCodes) {}

    public record AddProviderRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 80) String displayName,
            @NotBlank @Pattern(regexp = "^\\+[1-9][0-9]{7,14}$") String contactPhone,
            @Size(max = 80) String rescueVehicleLabel) {}

    public record ProviderMemberResponse(
            UUID userId, String displayName, String contactPhone, String status,
            boolean available, String rescueVehicleLabel, Instant locationUpdatedAt) {}

    public record ProviderMemberStatusRequest(
            @NotBlank @Pattern(regexp = "active|suspended|left") String status) {}

    public record StaffRoleRequest(
            @NotNull UUID userId,
            @NotBlank @Pattern(regexp = "admin|dispatcher|customer") String role) {}

    public record PushDeviceRequest(
            @NotBlank @Pattern(regexp = "^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]+]$") String token,
            @NotNull UUID installationId,
            @NotBlank @Pattern(regexp = "ios|android") String platform) {}

    public record PushDeviceDeleteRequest(
            @NotBlank @Pattern(regexp = "^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]+]$") String token,
            @NotNull UUID installationId) {}
}

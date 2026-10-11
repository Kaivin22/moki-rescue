package com.danang.motorescue.service;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommunicationModels {
    private CommunicationModels() {}
    public record Page<T>(List<T> items, Instant nextBefore, UUID nextBeforeId) {}
    public record Notification(UUID id, String kind, String title, String body,
            String targetType, UUID targetId, Instant readAt, Instant createdAt) {}
    public record Ticket(UUID id, UUID ownerId, String ownerName, UUID incidentId, String subject,
            String description, String status, long version, Instant createdAt, Instant updatedAt) {}
    public record Message(UUID id, UUID authorId, String authorName, String authorRole, String body,
            boolean internal, Instant createdAt) {}
    public record Announcement(UUID id, String audience, String title, String body,
            int recipientCount, Instant createdAt) {}
    public record Count(long count) {}
    public record CreateTicket(@NotNull UUID id, @NotBlank @Size(min = 5, max = 160) String subject,
            @NotBlank @Size(min = 10, max = 4000) String description) {}
    public record SendMessage(@NotNull UUID id, @NotBlank @Size(max = 4000) String body, boolean internal) {}
    public record ChangeStatus(@NotNull @Min(0) Long version,
            @NotBlank @Pattern(regexp = "open|waiting_user|resolved|dismissed") String status,
            @NotBlank @Size(min = 5, max = 500) String note) {}
    public record Publish(@NotNull UUID id, @NotBlank @Pattern(regexp = "all|customer|provider|admin") String audience,
            @NotBlank @Size(min = 5, max = 160) String title, @NotBlank @Size(min = 10, max = 4000) String body) {}
}

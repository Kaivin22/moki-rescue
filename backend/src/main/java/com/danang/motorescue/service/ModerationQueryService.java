package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Read-only, administrator-only inboxes. Mutations retain their existing audited services. */
@Service
public class ModerationQueryService {
    public record Entry(UUID id, UUID requestId, UUID teamId, String teamName, String subject,
            String body, String status, Double rating, Integer ratingCount, String resolutionNote,
            Instant createdAt) {}
    public record Page(List<Entry> items, Instant nextBefore, UUID nextBeforeId) {}
    private final JdbcTemplate jdbc;

    public ModerationQueryService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Page list(Actor actor, String kind, String status, Instant before, UUID beforeId, int limit) {
        requireAdmin(actor);
        String source = source(kind);
        if ((before == null) != (beforeId == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "Cần đủ hai giá trị phân trang.");
        }
        if (!statuses(kind).contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Bộ lọc không hợp lệ.");
        }
        int size = Math.max(1, Math.min(100, limit));
        var parameters = new ArrayList<Object>();
        String sql = "SELECT * FROM (" + source + ") inbox WHERE 1=1";
        if (!"all".equals(status)) { sql += " AND status = ?"; parameters.add(status); }
        if (before != null) {
            sql += " AND (created_at, id) < (?, ?)";
            parameters.add(Timestamp.from(before));
            parameters.add(beforeId);
        }
        sql += " ORDER BY created_at DESC, id DESC LIMIT ?";
        parameters.add(size + 1);
        List<Entry> rows = query(sql, parameters.toArray());
        boolean more = rows.size() > size;
        List<Entry> items = List.copyOf(rows.subList(0, Math.min(size, rows.size())));
        Entry last = more ? items.get(items.size() - 1) : null;
        return new Page(items, last == null ? null : last.createdAt(), last == null ? null : last.id());
    }

    public Entry detail(Actor actor, String kind, UUID id) {
        requireAdmin(actor);
        List<Entry> rows = query("SELECT * FROM (" + source(kind) + ") inbox WHERE id = ?", id);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "MODERATION_NOT_FOUND", "Không tìm thấy nội dung.");
        return rows.get(0);
    }

    private List<Entry> query(String sql, Object... parameters) {
        return jdbc.query(sql, (rs, row) -> new Entry(
                rs.getObject("id", UUID.class), rs.getObject("request_id", UUID.class),
                rs.getObject("team_id", UUID.class), rs.getString("team_name"), rs.getString("subject"),
                rs.getString("body"), rs.getString("status"), rs.getObject("rating", Double.class),
                rs.getObject("rating_count", Integer.class), rs.getString("resolution_note"),
                rs.getTimestamp("created_at").toInstant()), parameters);
    }

    private List<String> statuses(String kind) {
        return switch (kind) {
            case "reviews" -> List.of("all", "visible", "hidden");
            case "incidents" -> List.of("all", "open", "resolved", "dismissed");
            case "quality-alerts" -> List.of("all", "open", "warned", "resolved");
            default -> throw invalidKind();
        };
    }

    private String source(String kind) {
        // Fixed SQL branches only: neither kind nor filters become SQL identifiers.
        return switch (kind) {
            case "reviews" -> """
                    SELECT r.id, r.request_id, r.team_id, t.name AS team_name,
                           p.display_name AS subject, r.comment AS body,
                           CASE WHEN r.is_hidden THEN 'hidden' ELSE 'visible' END AS status,
                           r.rating::DOUBLE PRECISION AS rating, NULL::INTEGER AS rating_count,
                           r.moderation_note AS resolution_note, r.created_at
                    FROM public.reviews r
                    JOIN public.rescue_teams t ON t.id = r.team_id
                    JOIN public.provider_members p ON p.user_id = r.provider_id
                    """;
            case "incidents" -> """
                    SELECT r.id, r.request_id, r.team_id, t.name AS team_name,
                           r.category AS subject, r.description AS body, r.status,
                           NULL::DOUBLE PRECISION AS rating, NULL::INTEGER AS rating_count,
                           r.resolution_note, r.created_at
                    FROM public.incident_reports r JOIN public.rescue_teams t ON t.id = r.team_id
                    """;
            case "quality-alerts" -> """
                    SELECT r.id, NULL::UUID AS request_id, r.team_id, t.name AS team_name,
                           r.severity AS subject, NULL::TEXT AS body, r.status,
                           r.average_rating::DOUBLE PRECISION AS rating, r.rating_count,
                           r.action_note AS resolution_note, r.created_at
                    FROM public.team_quality_alerts r JOIN public.rescue_teams t ON t.id = r.team_id
                    """;
            default -> throw invalidKind();
        };
    }

    private ApiException invalidKind() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INBOX", "Loại nội dung không hợp lệ.");
    }

    private void requireAdmin(Actor actor) {
        if (!"admin".equals(actor.role())) throw new ApiException(
                HttpStatus.FORBIDDEN, "ADMIN_ROLE_REQUIRED", "Chức năng này chỉ dành cho quản trị viên.");
    }
}

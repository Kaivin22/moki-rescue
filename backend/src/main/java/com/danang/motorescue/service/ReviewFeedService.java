package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReviewFeedService {
    public record Entry(UUID id, String providerName, short rating, String comment, boolean hidden, Instant createdAt) {}
    public record Page(List<Entry> items, Integer nextOffset) {}
    private final JdbcTemplate jdbc;
    public ReviewFeedService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Page list(Actor actor, int offset) {
        if (!List.of("customer", "provider", "admin").contains(actor.role()))
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Không có quyền xem đánh giá.");
        int start = Math.max(0, offset);
        List<Entry> rows = jdbc.query("""
                SELECT r.id, p.display_name, r.rating, r.comment, r.is_hidden, r.created_at
                FROM public.reviews r JOIN public.provider_members p ON p.user_id = r.provider_id
                WHERE (? = 'admin' OR NOT r.is_hidden)
                  AND (? = 'admin' OR (? = 'provider' AND r.provider_id = ?)
                    OR (? = 'customer' AND (r.customer_id = ? OR EXISTS (
                      SELECT 1 FROM public.rescue_requests mine
                      WHERE mine.customer_id = ? AND mine.assigned_provider_id = r.provider_id))))
                ORDER BY r.created_at DESC, r.id DESC LIMIT 51 OFFSET ?
                """, (rs, n) -> new Entry(rs.getObject("id", UUID.class), rs.getString("display_name"),
                rs.getShort("rating"), rs.getString("comment"), rs.getBoolean("is_hidden"),
                rs.getTimestamp("created_at").toInstant()),
                actor.role(), actor.role(), actor.role(), actor.id(), actor.role(), actor.id(), actor.id(), start);
        return new Page(rows.stream().limit(50).toList(), rows.size() > 50 ? start + 50 : null);
    }
}

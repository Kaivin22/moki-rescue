package com.danang.motorescue.service;

import com.danang.motorescue.config.AssistantProperties;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssistantQuotaService {
    public record Reservation(long eventId, int remainingToday) {}

    private final JdbcTemplate jdbc;
    private final AssistantProperties properties;

    public AssistantQuotaService(JdbcTemplate jdbc, AssistantProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    @Transactional
    public Reservation reserve(UUID userId) {
        jdbc.query(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                rs -> null,
                "assistant:" + userId);

        Long minuteCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.assistant_usage_events
                WHERE user_id = ? AND created_at >= NOW() - INTERVAL '1 minute'
                """, Long.class, userId);
        if (minuteCount != null && minuteCount >= properties.requestsPerMinute()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ASSISTANT_MINUTE_LIMIT",
                    "Bạn gửi quá nhanh. Vui lòng chờ một phút rồi thử lại.");
        }

        Long dayCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.assistant_usage_events
                WHERE user_id = ? AND created_at >= NOW() - INTERVAL '24 hours'
                """, Long.class, userId);
        if (dayCount != null && dayCount >= properties.requestsPerDay()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ASSISTANT_DAILY_LIMIT",
                    "Bạn đã dùng hết lượt trợ lý trong 24 giờ. Vui lòng quay lại sau.");
        }

        Long eventId = jdbc.queryForObject("""
                INSERT INTO public.assistant_usage_events(user_id) VALUES (?) RETURNING id
                """, Long.class, userId);
        int used = dayCount == null ? 1 : Math.toIntExact(dayCount + 1);
        return new Reservation(eventId == null ? 0 : eventId, Math.max(0, properties.requestsPerDay() - used));
    }

    public void release(Reservation reservation) {
        if (reservation == null || reservation.eventId() <= 0 || jdbc == null) return;
        jdbc.update("DELETE FROM public.assistant_usage_events WHERE id = ?", reservation.eventId());
    }
}

package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class RescueNotificationService {
    private final JdbcTemplate jdbc;
    private final PushNotificationService push;

    RescueNotificationService(JdbcTemplate jdbc, PushNotificationService push) {
        this.jdbc = jdbc;
        this.push = push;
    }

    void notifyCounterparty(Actor actor, UUID requestId, NotificationKind kind, String detail) {
        UUID target = jdbc.query("""
                SELECT CASE WHEN customer_id = ? THEN assigned_provider_id ELSE customer_id END
                FROM public.rescue_requests WHERE id = ?
                """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null, actor.id(), requestId);
        if (target != null) push.notifyUser(target, kind, detail, requestId);
    }

    void notifyParticipants(UUID requestId, NotificationKind kind, String detail) {
        List<UUID> targets = jdbc.query("""
                SELECT participant_id FROM (
                  SELECT customer_id AS participant_id FROM public.rescue_requests WHERE id = ?
                  UNION
                  SELECT assigned_provider_id FROM public.rescue_requests WHERE id = ?
                ) participants WHERE participant_id IS NOT NULL
                """, (rs, rowNum) -> rs.getObject(1, UUID.class), requestId, requestId);
        for (UUID target : targets) push.notifyUser(target, kind, detail, requestId);
    }
}

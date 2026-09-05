package com.danang.motorescue.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PushOutboxJob {
    private static final Logger log = LoggerFactory.getLogger(PushOutboxJob.class);
    private final JdbcTemplate jdbc;
    private final PushNotificationService push;

    public PushOutboxJob(JdbcTemplate jdbc, PushNotificationService push) {
        this.jdbc = jdbc;
        this.push = push;
    }

    @Scheduled(fixedDelayString = "${app.push.outbox-scan-interval-ms:1000}")
    public void deliver() {
        jdbc.update("DELETE FROM public.push_outbox WHERE created_at < NOW() - INTERVAL '2 days'");
        jdbc.update("UPDATE public.push_outbox SET state = 'expired' WHERE state = 'pending' AND expires_at <= NOW()");
        for (int i = 0; i < 20; i++) {
            UUID lease = UUID.randomUUID();
            UUID id = jdbc.query("""
                    WITH due AS (
                      SELECT id FROM public.push_outbox
                      WHERE state = 'pending' AND available_at <= NOW() AND expires_at > NOW()
                      ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 1
                    )
                    UPDATE public.push_outbox job
                    SET available_at = NOW() + INTERVAL '2 minutes', lease_id = ?, attempts = attempts + 1
                    FROM due WHERE job.id = due.id RETURNING job.id
                    """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null, lease);
            if (id == null) return;
            PushNotificationService.DeliveryResult result;
            try {
                result = push.deliver(id);
            } catch (RuntimeException error) {
                log.warn("Push outbox delivery deferred ({})", error.getClass().getSimpleName());
                result = PushNotificationService.DeliveryResult.RETRY;
            }
            jdbc.update("""
                    UPDATE public.push_outbox
                    SET state = CASE WHEN ? = 'RETRY' AND attempts < ? THEN 'pending'
                                     WHEN ? = 'SENT' THEN 'sent' ELSE 'failed' END,
                        available_at = NOW() + (LEAST(? * power(2, LEAST(attempts - 1, 6)), 60) * INTERVAL '1 second'),
                        lease_id = NULL
                    WHERE id = ? AND lease_id = ? AND state = 'pending'
                    """, result.name(), push.maxDeliveryAttempts(), result.name(), push.initialBackoffSeconds(), id, lease);
        }
    }
}

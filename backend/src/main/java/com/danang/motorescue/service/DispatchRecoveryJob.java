package com.danang.motorescue.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DispatchRecoveryJob {
    private static final Logger log = LoggerFactory.getLogger(DispatchRecoveryJob.class);
    private final JdbcTemplate jdbc;
    private final DispatchService dispatch;

    public DispatchRecoveryJob(JdbcTemplate jdbc, DispatchService dispatch) {
        this.jdbc = jdbc;
        this.dispatch = dispatch;
    }

    @Scheduled(fixedDelayString = "${app.matching.recovery-scan-interval-ms:5000}")
    public void recover() {
        // Claim one at a time: network calls never hold a database transaction.
        for (int i = 0; i < 20; i++) {
            UUID lease = UUID.randomUUID();
            UUID requestId = jdbc.query("""
                    WITH due AS (
                      SELECT request_id FROM public.dispatch_recovery_jobs
                      WHERE available_at <= NOW() ORDER BY available_at, request_id
                      FOR UPDATE SKIP LOCKED LIMIT 1
                    )
                    UPDATE public.dispatch_recovery_jobs job
                    SET available_at = NOW() + INTERVAL '2 minutes', lease_id = ?,
                        attempts = LEAST(attempts + 1, 1000000)
                    FROM due WHERE job.request_id = due.request_id RETURNING job.request_id
                    """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null, lease);
            if (requestId == null) return;
            try {
                dispatch.match(requestId);
                jdbc.update("DELETE FROM public.dispatch_recovery_jobs WHERE request_id = ? AND lease_id = ?",
                        requestId, lease);
            } catch (RuntimeException error) {
                // No SQL exception messages, request payloads or coordinates in the job/log.
                jdbc.update("""
                        UPDATE public.dispatch_recovery_jobs
                        SET available_at = NOW() + (LEAST(attempts * 30, 300) * INTERVAL '1 second'),
                            last_error_type = ?, lease_id = NULL
                        WHERE request_id = ? AND lease_id = ?
                        """, error.getClass().getSimpleName(), requestId, lease);
                log.warn("Dispatch recovery deferred ({})", error.getClass().getSimpleName());
            }
        }
    }
}

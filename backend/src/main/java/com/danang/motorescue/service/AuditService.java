package com.danang.motorescue.service;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(UUID actorId, String action, String entityType, Object entityId) {
        jdbc.update("""
                INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
                VALUES (?, ?, ?, ?)
                """, actorId, action, entityType, entityId == null ? null : entityId.toString());
    }
}

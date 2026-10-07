package com.danang.motorescue.service;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

final class CaseClosureSupport {
    private CaseClosureSupport() {}

    static void resolveLifecycleFlags(JdbcTemplate jdbc, UUID requestId, UUID actorId) {
        // Complaints, incidents and general support are independent of whether a job has ended.
        jdbc.update("""
                UPDATE public.case_attention_flags
                SET status = 'resolved', resolved_at = NOW(), resolved_by = ?,
                    resolution_note = 'Ca đã kết thúc; đóng cảnh báo vòng đời. Khiếu nại được xử lý riêng.'
                WHERE request_id = ? AND status = 'open' AND code IN (
                  'provider_start_timeout', 'provider_gps_stale', 'arrival_confirmation_overdue',
                  'quote_decision_overdue', 'approved_work_start_overdue',
                  'completion_confirmation_overdue', 'work_progress_overdue', 'completion_dispute')
                """, actorId, requestId);
    }
}

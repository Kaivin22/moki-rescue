package com.danang.motorescue.service;

import com.danang.motorescue.config.CaseLifecycleProperties;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class CaseLifecycleService {
    private record AssignmentTimeout(UUID requestId, UUID customerId, UUID providerId) {}
    private record AttentionTarget(UUID requestId, UUID targetId) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final PushNotificationService push;
    private final AuditService audit;
    private final CaseLifecycleProperties properties;

    public CaseLifecycleService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            PushNotificationService push,
            AuditService audit,
            CaseLifecycleProperties properties) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.push = push;
        this.audit = audit;
        this.properties = properties;
    }

    public void scan() {
        jdbc.update("DELETE FROM public.api_rate_limit_windows WHERE window_start < NOW() - INTERVAL '2 hours'");
        resolveFlagsWhoseStateEnded();
        requeueAssignmentsThatNeverStarted();
        flagGpsStale();
        flagStateTimeout("arrival_confirmation_overdue", "awaiting_arrival_confirmation",
                properties.arrivalConfirmationTimeout().toSeconds(), "customer");
        flagStateTimeout("quote_decision_overdue", "awaiting_quote",
                properties.quoteDecisionTimeout().toSeconds(), "customer");
        flagStateTimeout("approved_work_start_overdue", "quote_approved",
                properties.assignedStartTimeout().toSeconds(), "provider");
        flagStateTimeout("completion_confirmation_overdue", "awaiting_completion",
                properties.completionConfirmationTimeout().toSeconds(), "customer");
        flagWorkProgressOverdue();
    }

    private void requeueAssignmentsThatNeverStarted() {
        List<AssignmentTimeout> timedOut = transactions.execute(status -> {
            List<AssignmentTimeout> rows = jdbc.query("""
                    SELECT id, customer_id, assigned_provider_id
                    FROM public.rescue_requests
                    WHERE status = 'assigned'
                      AND updated_at < NOW() - (? * INTERVAL '1 second')
                    FOR UPDATE SKIP LOCKED
                    """, (rs, rowNum) -> new AssignmentTimeout(
                    rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class),
                    rs.getObject("assigned_provider_id", UUID.class)),
                    properties.assignedStartTimeout().toSeconds());
            for (AssignmentTimeout row : rows) {
                jdbc.update("""
                        UPDATE public.rescue_requests
                        SET status = 'searching', assigned_team_id = NULL, assigned_provider_id = NULL,
                            road_distance_m = NULL, eta_minutes = NULL, routing_status = 'pending', work_type = NULL
                        WHERE id = ? AND status = 'assigned' AND assigned_provider_id = ?
                        """, row.requestId(), row.providerId());
                jdbc.update("""
                        UPDATE public.dispatch_offers SET status = 'declined', responded_at = NOW()
                        WHERE request_id = ? AND provider_id = ? AND status = 'accepted'
                        """, row.requestId(), row.providerId());
                jdbc.update("""
                        UPDATE public.provider_members
                        SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                            location_accuracy_m = NULL
                        WHERE user_id = ?
                        """, row.providerId());
                audit.record(null, "request.provider_start_timeout", "rescue_request", row.requestId());
            }
            return rows;
        });
        if (timedOut == null) return;
        for (AssignmentTimeout row : timedOut) {
            push.notifyUser(row.customerId(), NotificationKind.STATUS_CHANGED, "rematching", row.requestId());
            dispatch.match(row.requestId());
        }
    }

    private void flagGpsStale() {
        List<AttentionTarget> targets = jdbc.query("""
                WITH candidates AS (
                  SELECT rr.id, rr.assigned_provider_id AS target_id
                  FROM public.rescue_requests rr
                  LEFT JOIN LATERAL (
                    SELECT recorded_at FROM public.provider_location_checkpoints checkpoint
                    WHERE checkpoint.request_id = rr.id ORDER BY recorded_at DESC LIMIT 1
                  ) latest ON TRUE
                  WHERE rr.status IN ('en_route', 'awaiting_arrival_confirmation', 'transporting')
                    AND COALESCE(latest.recorded_at, rr.updated_at)
                      < NOW() - (? * INTERVAL '1 second')
                ), inserted AS (
                  INSERT INTO public.case_attention_flags(request_id, code)
                  SELECT id, 'provider_gps_stale' FROM candidates
                  ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                  RETURNING request_id
                )
                SELECT inserted.request_id, candidates.target_id
                FROM inserted JOIN candidates ON candidates.id = inserted.request_id
                """, (rs, rowNum) -> new AttentionTarget(
                rs.getObject("request_id", UUID.class), rs.getObject("target_id", UUID.class)),
                properties.providerGpsStaleAfter().toSeconds());
        notifyAttentionTargets(targets, "provider_gps_stale");
    }

    private void flagStateTimeout(String code, String requestStatus, long timeoutSeconds, String targetRole) {
        List<AttentionTarget> targets = jdbc.query("""
                WITH candidates AS (
                  SELECT id,
                         CASE WHEN ? = 'customer' THEN customer_id ELSE assigned_provider_id END AS target_id
                  FROM public.rescue_requests
                  WHERE status = ? AND updated_at < NOW() - (? * INTERVAL '1 second')
                ), inserted AS (
                  INSERT INTO public.case_attention_flags(request_id, code)
                  SELECT id, ? FROM candidates
                  ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                  RETURNING request_id
                )
                SELECT inserted.request_id, candidates.target_id
                FROM inserted JOIN candidates ON candidates.id = inserted.request_id
                """, (rs, rowNum) -> new AttentionTarget(
                rs.getObject("request_id", UUID.class), rs.getObject("target_id", UUID.class)),
                targetRole, requestStatus, timeoutSeconds, code);
        notifyAttentionTargets(targets, code);
    }

    private void flagWorkProgressOverdue() {
        List<AttentionTarget> targets = jdbc.query("""
                WITH candidates AS (
                  SELECT id, assigned_provider_id AS target_id
                  FROM public.rescue_requests
                  WHERE status IN ('repairing', 'transporting')
                    AND updated_at < NOW() - (? * INTERVAL '1 second')
                ), inserted AS (
                  INSERT INTO public.case_attention_flags(request_id, code)
                  SELECT id, 'work_progress_overdue' FROM candidates
                  ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                  RETURNING request_id
                )
                SELECT inserted.request_id, candidates.target_id
                FROM inserted JOIN candidates ON candidates.id = inserted.request_id
                """, (rs, rowNum) -> new AttentionTarget(
                rs.getObject("request_id", UUID.class), rs.getObject("target_id", UUID.class)),
                properties.workProgressTimeout().toSeconds());
        notifyAttentionTargets(targets, "work_progress_overdue");
    }

    private void notifyAttentionTargets(List<AttentionTarget> targets, String detail) {
        for (AttentionTarget target : targets) {
            audit.record(null, "request.attention." + detail, "rescue_request", target.requestId());
            if (target.targetId() != null) {
                push.notifyUser(target.targetId(), NotificationKind.STATUS_CHANGED, detail, target.requestId());
            }
        }
    }

    private void resolveFlagsWhoseStateEnded() {
        jdbc.update("""
                UPDATE public.case_attention_flags flag
                SET status = 'resolved', resolved_at = NOW(), resolution_note = 'Trạng thái ca đã thay đổi.'
                FROM public.rescue_requests rr
                WHERE flag.request_id = rr.id AND flag.status = 'open'
                  AND (
                    (flag.code = 'arrival_confirmation_overdue' AND rr.status <> 'awaiting_arrival_confirmation')
                    OR (flag.code = 'quote_decision_overdue' AND rr.status <> 'awaiting_quote')
                    OR (flag.code = 'approved_work_start_overdue' AND rr.status <> 'quote_approved')
                    OR (flag.code = 'completion_confirmation_overdue' AND rr.status <> 'awaiting_completion')
                    OR (flag.code = 'work_progress_overdue' AND rr.status NOT IN ('repairing', 'transporting'))
                    OR (flag.code = 'provider_gps_stale'
                        AND rr.status NOT IN ('en_route', 'awaiting_arrival_confirmation', 'transporting'))
                  )
                """);
    }
}

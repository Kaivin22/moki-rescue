package com.danang.motorescue.service;

import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.model.ApiModels.QualityReviewResponse;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class QualityService {
    private record TeamStats(UUID teamId, double average, int count) {}
    private record AlertTarget(UUID id, UUID teamId, String status) {}
    private record ReviewTarget(UUID requestId, UUID teamId) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final QualityProperties policy;

    public QualityService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            AuditService audit,
            QualityProperties policy) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
        this.policy = policy;
    }

    public void assessRequest(UUID requestId) {
        TeamStats stats = jdbc.query("""
                SELECT rr.assigned_team_id,
                       ROUND(AVG(review.rating)::NUMERIC, 2) AS average_rating,
                       COUNT(review.id)::INTEGER AS rating_count
                FROM public.rescue_requests rr
                LEFT JOIN public.reviews review
                  ON review.team_id = rr.assigned_team_id AND NOT review.is_hidden
                WHERE rr.id = ? AND rr.assigned_team_id IS NOT NULL
                GROUP BY rr.assigned_team_id
                """, rs -> {
            if (!rs.next()) return null;
            BigDecimal average = rs.getBigDecimal("average_rating");
            return new TeamStats(
                    rs.getObject("assigned_team_id", UUID.class),
                    average == null ? 0 : average.doubleValue(),
                    rs.getInt("rating_count"));
        }, requestId);
        if (stats != null) assess(stats);
    }

    private void assess(TeamStats stats) {
        String severity = policy.alertSeverity(stats.average(), stats.count());
        if (severity == null) {
            jdbc.update("""
                    UPDATE public.team_quality_alerts
                    SET status = 'resolved',
                        action_note = 'System resolved: rating recovered or sample is below the policy minimum.',
                        actioned_by = NULL,
                        actioned_at = NOW(),
                        review_count_checkpoint = GREATEST(review_count_checkpoint, ?)
                    WHERE team_id = ? AND status IN ('open', 'warned')
                    """, stats.count(), stats.teamId());
            return;
        }

        int refreshed = jdbc.update("""
                UPDATE public.team_quality_alerts
                SET severity = ?, average_rating = ?, rating_count = ?
                WHERE team_id = ? AND status = 'open'
                """, severity, stats.average(), stats.count(), stats.teamId());
        if (refreshed > 0) return;

        Integer previousCheckpoint = jdbc.queryForObject("""
                SELECT MAX(review_count_checkpoint)
                FROM public.team_quality_alerts
                WHERE team_id = ? AND status <> 'open'
                """, Integer.class, stats.teamId());
        if (!policy.canRepeat(previousCheckpoint, stats.count())) return;

        jdbc.update("""
                INSERT INTO public.team_quality_alerts(
                  team_id, severity, average_rating, rating_count, review_count_checkpoint
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT DO NOTHING
                """, stats.teamId(), severity, stats.average(), stats.count(), stats.count());
    }

    public void warn(Actor actor, UUID alertId, String note) {
        requireAdmin(actor);
        transactions.executeWithoutResult(status -> {
            AlertTarget target = lockAlert(alertId);
            if (!"open".equals(target.status())) {
                throw new ApiException(HttpStatus.CONFLICT, "QUALITY_ALERT_ALREADY_ACTIONED",
                        "Tín hiệu chất lượng này đã được xử lý.");
            }
            jdbc.queryForObject("SELECT id FROM public.rescue_teams WHERE id = ? FOR UPDATE", UUID.class, target.teamId());
            Integer warningNumber = jdbc.queryForObject("""
                    SELECT COUNT(*) + 1
                    FROM public.team_quality_alerts
                    WHERE team_id = ? AND warning_number IS NOT NULL
                    """, Integer.class, target.teamId());
            jdbc.update("""
                    UPDATE public.team_quality_alerts
                    SET status = 'warned', warning_number = ?, action_note = ?,
                        actioned_by = ?, actioned_at = NOW(),
                        review_count_checkpoint = rating_count
                    WHERE id = ?
                    """, warningNumber, note.trim(), actor.id(), alertId);
            audit.record(actor.id(), "quality.warning.issued", "rescue_team", target.teamId());
        });
    }

    public void resolve(Actor actor, UUID alertId, String note) {
        requireAdmin(actor);
        transactions.executeWithoutResult(status -> {
            AlertTarget target = lockAlert(alertId);
            if ("resolved".equals(target.status())) {
                throw new ApiException(HttpStatus.CONFLICT, "QUALITY_ALERT_ALREADY_ACTIONED",
                        "Tín hiệu chất lượng này đã được xử lý.");
            }
            jdbc.update("""
                    UPDATE public.team_quality_alerts
                    SET status = 'resolved', action_note = ?, actioned_by = ?, actioned_at = NOW(),
                        review_count_checkpoint = rating_count
                    WHERE id = ?
                    """, note.trim(), actor.id(), alertId);
            audit.record(actor.id(), "quality.alert.resolved", "rescue_team", target.teamId());
        });
    }

    public List<QualityReviewResponse> reviews(Actor actor, UUID teamId) {
        requireAdmin(actor);
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM public.rescue_teams WHERE id = ?)", Boolean.class, teamId);
        if (!Boolean.TRUE.equals(exists)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy đội cứu hộ.");
        }
        String sql = """
                SELECT review.id, review.request_id, provider.display_name AS provider_name,
                       review.rating, review.comment, review.is_hidden,
                       review.created_at, review.updated_at
                FROM public.reviews review
                JOIN public.provider_members provider ON provider.user_id = review.provider_id
                WHERE review.team_id = ?
                ORDER BY review.created_at DESC
                LIMIT %d
                """.formatted(policy.adminReviewListLimit());
        return jdbc.query(sql, (rs, rowNum) -> new QualityReviewResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("request_id", UUID.class),
                rs.getString("provider_name"),
                rs.getShort("rating"),
                rs.getString("comment"),
                rs.getBoolean("is_hidden"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()), teamId);
    }

    public void setReviewVisibility(Actor actor, UUID reviewId, boolean hidden, String note) {
        requireAdmin(actor);
        transactions.executeWithoutResult(status -> {
            ReviewTarget target = jdbc.query("""
                    SELECT request_id, team_id
                    FROM public.reviews
                    WHERE id = ?
                    FOR UPDATE
                    """, rs -> rs.next() ? new ReviewTarget(
                    rs.getObject("request_id", UUID.class),
                    rs.getObject("team_id", UUID.class)) : null, reviewId);
            if (target == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND", "Không tìm thấy đánh giá.");
            }
            jdbc.update("""
                    UPDATE public.reviews
                    SET is_hidden = ?, moderation_note = ?, moderated_by = ?, moderated_at = NOW()
                    WHERE id = ?
                    """, hidden, note.trim(), actor.id(), reviewId);
            audit.record(actor.id(), hidden ? "review.hidden" : "review.restored", "review", reviewId);
            assessRequest(target.requestId());
        });
    }

    private AlertTarget lockAlert(UUID alertId) {
        AlertTarget target = jdbc.query("""
                SELECT id, team_id, status
                FROM public.team_quality_alerts
                WHERE id = ?
                FOR UPDATE
                """, rs -> rs.next() ? new AlertTarget(
                rs.getObject("id", UUID.class),
                rs.getObject("team_id", UUID.class),
                rs.getString("status")) : null, alertId);
        if (target == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "QUALITY_ALERT_NOT_FOUND",
                    "Không tìm thấy tín hiệu chất lượng.");
        }
        return target;
    }

    private void requireAdmin(Actor actor) {
        if (!"admin".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ROLE_REQUIRED",
                    "Chức năng này chỉ dành cho quản trị viên.");
        }
    }
}

package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.clean;

import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.ReviewRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueReviewService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final QualityService quality;
    private final RescuePolicyProperties policy;
    private final RescueRequestAccess access;

    public RescueReviewService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            AuditService audit,
            QualityService quality,
            RescuePolicyProperties policy,
            RescueRequestAccess access) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
        this.quality = quality;
        this.policy = policy;
        this.access = access;
    }

    public void review(Actor actor, UUID requestId, ReviewRequest input) {
        access.requireCustomer(actor);
        int changed = transactions.execute(status -> {
            int updated = jdbc.update("""
                    INSERT INTO public.reviews(request_id, customer_id, team_id, provider_id, rating, comment)
                    SELECT rr.id, rr.customer_id, rr.assigned_team_id, rr.assigned_provider_id, ?, ?
                    FROM public.rescue_requests rr
                    WHERE rr.id = ? AND rr.customer_id = ? AND rr.status = 'completed'
                      AND rr.completed_at >= NOW() - (? * INTERVAL '1 second')
                    ON CONFLICT (request_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
                    """, input.rating(), clean(input.comment()), requestId, actor.id(),
                    policy.reviewWindow().toSeconds());
            if (updated > 0) {
                audit.record(actor.id(), "review.saved", "rescue_request", requestId);
                quality.assessRequest(requestId);
            }
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "REVIEW_NOT_ALLOWED",
                    "Chỉ ca đã hoàn tất mới có thể được đánh giá.");
        }
    }

    public void deleteReview(Actor actor, UUID requestId) {
        access.requireCustomer(actor);
        int changed = transactions.execute(status -> {
            int deleted = jdbc.update("""
                    DELETE FROM public.reviews review
                    USING public.rescue_requests request
                    WHERE review.request_id = request.id AND request.id = ?
                      AND review.customer_id = ?
                      AND request.completed_at >= NOW() - (? * INTERVAL '1 second')
                    """, requestId, actor.id(), policy.reviewWindow().toSeconds());
            if (deleted > 0) {
                audit.record(actor.id(), "review.deleted", "rescue_request", requestId);
                quality.assessRequest(requestId);
            }
            return deleted;
        });
        if (changed == 0) {
            Boolean exists = jdbc.queryForObject("""
                    SELECT EXISTS(
                      SELECT 1 FROM public.reviews
                      WHERE request_id = ? AND customer_id = ?
                    )
                    """, Boolean.class, requestId, actor.id());
            if (Boolean.TRUE.equals(exists)) {
                throw new ApiException(HttpStatus.CONFLICT, "REVIEW_WINDOW_CLOSED",
                        "Đã hết thời hạn chỉnh sửa hoặc xóa đánh giá cho ca này.");
            }
            throw new ApiException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND", "Không tìm thấy đánh giá của bạn.");
        }
    }
}

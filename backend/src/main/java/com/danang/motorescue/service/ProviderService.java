package com.danang.motorescue.service;

import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.model.ApiModels.AvailabilityRequest;
import com.danang.motorescue.model.ApiModels.OfferResponse;
import com.danang.motorescue.model.ApiModels.ProviderLocationRequest;
import com.danang.motorescue.model.ApiModels.ProviderStatusResponse;
import com.danang.motorescue.model.ApiModels.RatingSummary;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ProviderService {
    private record AcceptedOffer(UUID requestId, UUID customerId) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final AuditService audit;
    private final PushNotificationService push;
    private final MatchingProperties properties;
    private final RescuePolicyProperties policy;
    private final QualityProperties qualityPolicy;

    public ProviderService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            AuditService audit,
            PushNotificationService push,
            MatchingProperties properties,
            RescuePolicyProperties policy,
            QualityProperties qualityPolicy) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.audit = audit;
        this.push = push;
        this.properties = properties;
        this.policy = policy;
        this.qualityPolicy = qualityPolicy;
    }

    public ProviderStatusResponse status(Actor actor) {
        requireProvider(actor);
        ProviderStatusResponse result = jdbc.query("""
                SELECT pm.is_available, team.name, pm.status,
                       rating.average_rating, rating.rating_count,
                       (SELECT COUNT(*) FROM public.team_quality_alerts alert
                        WHERE alert.team_id = team.id AND alert.warning_number IS NOT NULL) AS warning_count,
                       latest_warning.action_note AS quality_notice
                FROM public.provider_members pm
                JOIN public.rescue_teams team ON team.id = pm.team_id
                LEFT JOIN LATERAL (
                  SELECT ROUND(AVG(review.rating)::NUMERIC, 2) AS average_rating,
                         COUNT(*)::INTEGER AS rating_count
                  FROM public.reviews review
                  WHERE review.team_id = team.id AND NOT review.is_hidden
                ) rating ON TRUE
                LEFT JOIN LATERAL (
                  SELECT alert.action_note
                  FROM public.team_quality_alerts alert
                  WHERE alert.team_id = team.id AND alert.status = 'warned'
                  ORDER BY alert.actioned_at DESC
                  LIMIT 1
                ) latest_warning ON TRUE
                WHERE pm.user_id = ?
                """, rs -> {
            if (!rs.next()) return null;
            var average = rs.getBigDecimal("average_rating");
            int warningCount = rs.getInt("warning_count");
            return new ProviderStatusResponse(
                    rs.getBoolean("is_available"),
                    rs.getString("name"),
                    rs.getString("status"),
                    new RatingSummary(average == null ? null : average.doubleValue(), rs.getInt("rating_count")),
                    warningCount,
                    qualityPolicy.recommendsSuspensionReview(warningCount),
                    rs.getString("quality_notice"));
        }, actor.id());
        if (result == null) throw providerNotReady();
        return result;
    }

    public ProviderStatusResponse setAvailability(Actor actor, AvailabilityRequest input) {
        requireProvider(actor);
        if (input.available()) {
            Boolean busy = jdbc.queryForObject("""
                    SELECT EXISTS(
                      SELECT 1 FROM public.rescue_requests
                      WHERE assigned_provider_id = ? AND status NOT IN ('completed', 'cancelled')
                    )
                    """, Boolean.class, actor.id());
            if (Boolean.TRUE.equals(busy)) {
                throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_HAS_ACTIVE_REQUEST", "Không thể bật sẵn sàng khi đang xử lý một ca.");
            }
        }
        int changed = transactions.execute(status -> {
            int updated = jdbc.update("""
                    UPDATE public.provider_members pm
                    SET is_available = ?,
                        last_latitude = CASE WHEN ? THEN last_latitude ELSE NULL END,
                        last_longitude = CASE WHEN ? THEN last_longitude ELSE NULL END,
                        location_accuracy_m = CASE WHEN ? THEN location_accuracy_m ELSE NULL END
                    FROM public.rescue_teams team
                    WHERE pm.user_id = ? AND pm.status = 'active'
                      AND team.id = pm.team_id AND team.status = 'verified'
                    """, input.available(), input.available(), input.available(), input.available(), actor.id());
            if (updated > 0) {
                audit.record(actor.id(), input.available() ? "provider.available" : "provider.unavailable", "provider", actor.id());
            }
            return updated;
        });
        if (changed == 0) throw providerNotReady();
        return status(actor);
    }

    public List<OfferResponse> offers(Actor actor) {
        requireProvider(actor);
        dispatch.expireOffers();
        return jdbc.query("""
                SELECT offer.id, offer.request_id, rr.service_code,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       CONCAT(CASE WHEN ? = 'en' THEN 'Area near ' ELSE 'Khu vực gần ' END,
                              ROUND(rr.pickup_latitude::NUMERIC, 2), ', ',
                              ROUND(rr.pickup_longitude::NUMERIC, 2)) AS pickup_area_label,
                       rr.vehicle_power_type, offer.road_distance_m,
                       offer.eta_seconds, rr.version, offer.expires_at
                FROM public.dispatch_offers offer
                JOIN public.rescue_requests rr ON rr.id = offer.request_id
                JOIN public.service_types service ON service.code = rr.service_code
                WHERE offer.provider_id = ? AND offer.status = 'pending' AND offer.expires_at > NOW()
                ORDER BY offer.eta_seconds, offer.offered_at
                """, (rs, rowNum) -> new OfferResponse(
                rs.getObject("id", UUID.class), rs.getObject("request_id", UUID.class),
                rs.getString("service_code"), rs.getString("service_label"), rs.getString("pickup_area_label"),
                rs.getString("vehicle_power_type"), rs.getInt("road_distance_m"), rs.getInt("eta_seconds"),
                rs.getInt("version"), rs.getTimestamp("expires_at").toInstant()),
                actor.locale(), actor.locale(), actor.id());
    }

    public UUID accept(Actor actor, UUID offerId, int expectedRequestVersion) {
        requireProvider(actor);
        try {
            AcceptedOffer accepted = transactions.execute(status -> {
                UUID requestId = jdbc.queryForObject(
                        "SELECT public.api_accept_dispatch_offer(?, ?, ?)",
                        UUID.class, actor.id(), offerId, expectedRequestVersion);
                audit.record(actor.id(), "offer.accepted", "dispatch_offer", offerId);
                UUID customerId = jdbc.queryForObject(
                        "SELECT customer_id FROM public.rescue_requests WHERE id = ?", UUID.class, requestId);
                return new AcceptedOffer(requestId, customerId);
            });
            if (accepted == null) throw new IllegalStateException("Accepted offer transaction returned no result");
            push.notifyUser(accepted.customerId(), NotificationKind.PROVIDER_ASSIGNED, null, accepted.requestId());
            return accepted.requestId();
        } catch (DataAccessException ex) {
            String detail = ex.getMostSpecificCause().getMessage();
            if (detail != null && (detail.contains("OFFER_") || detail.contains("REQUEST_ALREADY_CHANGED")
                    || detail.contains("PROVIDER_NOT_ELIGIBLE"))) {
                throw new ApiException(HttpStatus.CONFLICT, "OFFER_NOT_AVAILABLE", "Đề nghị đã hết hạn hoặc được người khác nhận.");
            }
            throw ex;
        }
    }

    public boolean saveLocation(Actor actor, UUID requestId, ProviderLocationRequest input) {
        requireProvider(actor);
        validateAccuracy(input);
        Boolean assigned = jdbc.queryForObject("""
                SELECT EXISTS(
                  SELECT 1 FROM public.rescue_requests
                  WHERE id = ? AND assigned_provider_id = ?
                    AND status IN ('assigned', 'en_route', 'awaiting_arrival_confirmation', 'arrived',
                      'diagnosing', 'awaiting_quote', 'repairing', 'transporting', 'awaiting_completion')
                )
                """, Boolean.class, requestId, actor.id());
        if (!Boolean.TRUE.equals(assigned)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "LOCATION_NOT_ALLOWED", "Ca này không được phân công cho bạn.");
        }

        return Boolean.TRUE.equals(transactions.execute(status -> {
            jdbc.update("""
                    UPDATE public.provider_members
                    SET last_latitude = ?, last_longitude = ?, location_accuracy_m = ?
                    WHERE user_id = ? AND status = 'active'
                    """, input.latitude(), input.longitude(), input.accuracyM(), actor.id());
            int inserted = jdbc.update("""
                    INSERT INTO public.provider_location_checkpoints(
                      request_id, provider_id, latitude, longitude, accuracy_m
                    )
                    SELECT ?, ?, ?, ?, ?
                    WHERE NOT EXISTS (
                      SELECT 1 FROM public.provider_location_checkpoints
                      WHERE request_id = ? AND provider_id = ?
                        AND recorded_at > NOW() - (? * INTERVAL '1 second')
                    )
                    """, requestId, actor.id(), input.latitude(), input.longitude(), input.accuracyM(),
                    requestId, actor.id(), policy.checkpointDedupeSeconds());
            return inserted > 0;
        }));
    }

    public void saveAvailabilityLocation(Actor actor, ProviderLocationRequest input) {
        requireProvider(actor);
        validateAccuracy(input);
        int changed = jdbc.update("""
                UPDATE public.provider_members pm
                SET last_latitude = ?, last_longitude = ?, location_accuracy_m = ?
                FROM public.rescue_teams team
                WHERE pm.user_id = ? AND pm.status = 'active' AND pm.is_available
                  AND team.id = pm.team_id AND team.status = 'verified'
                """, input.latitude(), input.longitude(), input.accuracyM(), actor.id());
        if (changed == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_NOT_AVAILABLE",
                    "Hãy bật trạng thái sẵn sàng trước khi cập nhật vị trí nhận ca.");
        }
    }

    private void requireProvider(Actor actor) {
        if (!"provider".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PROVIDER_ROLE_REQUIRED", "Chức năng chỉ dành cho cứu hộ viên.");
        }
    }

    private void validateAccuracy(ProviderLocationRequest input) {
        if (input.accuracyM() > properties.providerLocationMaxAccuracyMeters()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "LOCATION_NOT_ACCURATE",
                    "Tín hiệu vị trí chưa đủ chính xác. Hãy ra nơi thoáng và thử lại.");
        }
    }

    private ApiException providerNotReady() {
        return new ApiException(HttpStatus.FORBIDDEN, "PROVIDER_NOT_READY", "Tài khoản cứu hộ viên hoặc đội chưa được xác minh.");
    }
}

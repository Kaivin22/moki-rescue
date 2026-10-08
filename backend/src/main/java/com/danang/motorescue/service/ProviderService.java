package com.danang.motorescue.service;

import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.model.ApiModels.AvailabilityRequest;
import com.danang.motorescue.model.ApiModels.OfferResponse;
import com.danang.motorescue.model.ApiModels.ProviderLocationRequest;
import com.danang.motorescue.model.ApiModels.ProviderStatusResponse;
import com.danang.motorescue.model.ApiModels.ProviderStatisticsResponse;
import com.danang.motorescue.model.ApiModels.ProviderWithdrawalResponse;
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
    private record Withdrawal(UUID requestId, UUID customerId, String previousStatus, String nextStatus) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final AuditService audit;
    private final PushNotificationService push;
    private final QualityProperties qualityPolicy;

    public ProviderService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            AuditService audit,
            PushNotificationService push,
            QualityProperties qualityPolicy) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.audit = audit;
        this.push = push;
        this.qualityPolicy = qualityPolicy;
    }

    public ProviderStatusResponse status(Actor actor) {
        requireProvider(actor);
        ProviderStatusResponse result = jdbc.query("""
                SELECT pm.is_available, team.name, pm.status, team.status AS team_status,
                       team.base_latitude, team.base_longitude,
                       public.api_is_in_service_area(team.base_latitude, team.base_longitude) AS shop_in_area,
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
                    rs.getString("quality_notice"), rs.getString("team_status"),
                    rs.getObject("base_latitude", Double.class), rs.getObject("base_longitude", Double.class),
                    rs.getBoolean("shop_in_area"));
        }, actor.id());
        if (result == null) throw providerNotReady();
        return result;
    }

    public ProviderStatisticsResponse statistics(Actor actor) {
        requireProvider(actor);
        // Identity comes from the authenticated JWT, never from a client-supplied team/provider ID.
        return jdbc.query("""
                SELECT COUNT(*) FILTER (WHERE rr.status = 'completed') AS completed,
                       COUNT(*) FILTER (WHERE rr.status NOT IN ('completed', 'cancelled')) AS active,
                       COUNT(*) FILTER (WHERE rr.status = 'cancelled') AS cancelled,
                       ROUND(AVG(review.rating)::NUMERIC, 2) AS average_rating,
                       COUNT(review.id)::INTEGER AS rating_count
                FROM public.rescue_requests rr
                LEFT JOIN public.reviews review ON review.request_id = rr.id AND NOT review.is_hidden
                WHERE rr.assigned_provider_id = ?
                """, rs -> {
            rs.next();
            var average = rs.getBigDecimal("average_rating");
            return new ProviderStatisticsResponse(rs.getLong("completed"), rs.getLong("active"), rs.getLong("cancelled"),
                    new RatingSummary(average == null ? null : average.doubleValue(), rs.getInt("rating_count")));
        }, actor.id());
    }

    public ProviderStatusResponse setAvailability(Actor actor, AvailabilityRequest input) {
        requireProvider(actor);
        if (input.available()) {
            // Old clients may still send GPS. Never use it for shop-based dispatch.
            ProviderStatusResponse current = status(actor);
            if (!"active".equals(current.status()) || !"verified".equals(current.teamStatus())) {
                throw providerNotReady();
            }
            if (!current.shopInServiceArea()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "SHOP_OUTSIDE_SERVICE_AREA",
                        "Cửa hàng chưa có tọa độ hợp lệ trong vùng phục vụ. Hãy nhờ admin cập nhật vị trí cửa hàng.");
            }
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
                        available_since = CASE
                          WHEN ? AND NOT pm.is_available THEN NOW()
                          WHEN ? THEN pm.available_since
                          ELSE NULL
                        END,
                        last_latitude = NULL, last_longitude = NULL, location_accuracy_m = NULL
                    FROM public.rescue_teams team
                    WHERE pm.user_id = ? AND team.id = pm.team_id
                      AND (NOT ? OR (pm.status = 'active' AND team.status = 'verified'
                        AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
                        AND NOT EXISTS (SELECT 1 FROM public.rescue_requests rr
                          WHERE rr.assigned_provider_id = pm.user_id
                            AND rr.status NOT IN ('completed', 'cancelled'))))
                    """, input.available(), input.available(), input.available(),
                    actor.id(), input.available());
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
                push.notifyUser(customerId, NotificationKind.PROVIDER_ASSIGNED, null, requestId);
                return new AcceptedOffer(requestId, customerId);
            });
            if (accepted == null) throw new IllegalStateException("Accepted offer transaction returned no result");
            return accepted.requestId();
        } catch (DataAccessException ex) {
            String detail = ex.getMostSpecificCause().getMessage();
            if (detail != null && detail.contains("OFFER_OUTSIDE_SERVICE_AREA")) {
                throw new ApiException(HttpStatus.CONFLICT, "OFFER_OUTSIDE_SERVICE_AREA",
                        "Vị trí cửa hàng hoặc địa điểm của ca nằm ngoài vùng phục vụ hiện tại. Không thể nhận đề nghị này.");
            }
            if (detail != null && (detail.contains("OFFER_") || detail.contains("REQUEST_ALREADY_CHANGED")
                    || detail.contains("PROVIDER_NOT_ELIGIBLE"))) {
                throw new ApiException(HttpStatus.CONFLICT, "OFFER_NOT_AVAILABLE", "Đề nghị đã hết hạn hoặc được người khác nhận.");
            }
            throw ex;
        }
    }

    public void decline(Actor actor, UUID offerId) {
        requireProvider(actor);
        UUID requestId = transactions.execute(status -> {
            UUID declinedRequestId = jdbc.query("""
                    UPDATE public.dispatch_offers
                    SET status = 'declined', responded_at = NOW()
                    WHERE id = ? AND provider_id = ? AND status = 'pending' AND expires_at > NOW()
                    RETURNING request_id
                    """, rs -> rs.next() ? rs.getObject("request_id", UUID.class) : null,
                    offerId, actor.id());
            if (declinedRequestId != null) {
                audit.record(actor.id(), "offer.declined", "dispatch_offer", offerId);
            }
            return declinedRequestId;
        });
        if (requestId == null) {
            throw new ApiException(HttpStatus.CONFLICT, "OFFER_NOT_AVAILABLE",
                    "Đề nghị đã hết hạn hoặc không còn dành cho bạn.");
        }
        dispatch.continueAfterDecline(requestId);
    }

    public ProviderWithdrawalResponse withdraw(Actor actor, UUID requestId, String reason) {
        requireProvider(actor);
        String cleanReason = reason == null ? "" : reason.trim();
        if (cleanReason.length() < 5 || cleanReason.length() > 300) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WITHDRAWAL_REASON_REQUIRED",
                    "Hãy nhập lý do không thể tiếp tục từ 5 đến 300 ký tự.");
        }
        Withdrawal withdrawal = transactions.execute(status -> {
            Withdrawal locked = jdbc.query("""
                    SELECT id, customer_id, status
                    FROM public.rescue_requests
                    WHERE id = ? AND assigned_provider_id = ?
                      AND status NOT IN ('completed', 'cancelled', 'no_provider', 'needs_dispatch')
                    FOR UPDATE
                    """, rs -> {
                if (!rs.next()) return null;
                String previous = rs.getString("status");
                String next = List.of("assigned", "en_route", "awaiting_arrival_confirmation").contains(previous)
                        ? "searching" : "needs_dispatch";
                return new Withdrawal(rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class),
                        previous, next);
            }, requestId, actor.id());
            if (locked == null) return null;

            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET status = ?, assigned_team_id = NULL, assigned_provider_id = NULL,
                        road_distance_m = NULL, eta_minutes = NULL, routing_status = 'pending', work_type = NULL
                    WHERE id = ? AND assigned_provider_id = ? AND status = ?
                    """, locked.nextStatus(), requestId, actor.id(), locked.previousStatus());
            if (updated == 0) return null;
            jdbc.update("""
                    UPDATE public.dispatch_offers SET status = 'declined', responded_at = NOW()
                    WHERE request_id = ? AND provider_id = ? AND status = 'accepted'
                    """, requestId, actor.id());
            jdbc.update("UPDATE public.quotes SET status = 'superseded' WHERE request_id = ? AND status = 'pending'",
                    requestId);
            jdbc.update("""
                    UPDATE public.provider_members
                    SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                        location_accuracy_m = NULL, available_since = NULL
                    WHERE user_id = ?
                    """, actor.id());
            if ("needs_dispatch".equals(locked.nextStatus())) {
                jdbc.update("""
                        INSERT INTO public.case_attention_flags(request_id, code, context_note)
                        VALUES (?, 'provider_withdrew', ?)
                        ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                        """, requestId, cleanReason);
            }
            jdbc.update("""
                    UPDATE public.case_attention_flags
                    SET status = 'resolved', resolved_at = NOW(),
                        resolution_note = 'Cứu hộ viên đã dừng chia sẻ vị trí.'
                    WHERE request_id = ? AND code = 'provider_gps_stale' AND status = 'open'
                    """, requestId);
            audit.record(actor.id(), "request.provider_withdrew." + locked.nextStatus(),
                    "rescue_request", requestId);
            push.notifyUser(locked.customerId(), NotificationKind.STATUS_CHANGED, locked.nextStatus(), requestId);
            return locked;
        });
        if (withdrawal == null) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_NOT_WITHDRAWABLE",
                    "Ca đã thay đổi hoặc không còn được phân công cho bạn.");
        }
        if ("searching".equals(withdrawal.nextStatus())) dispatch.match(requestId);
        return new ProviderWithdrawalResponse(requestId, withdrawal.nextStatus());
    }

    public boolean saveLocation(Actor actor, UUID requestId, ProviderLocationRequest input) {
        requireProvider(actor);
        // Older apps recognize this code and stop their active-case background task.
        throw new ApiException(HttpStatus.GONE, "LOCATION_NOT_ALLOWED",
                "Ứng dụng đã dừng theo dõi GPS trong ca. Hãy dùng Google Maps để dẫn đường.");
    }

    public void saveAvailabilityLocation(Actor actor, ProviderLocationRequest input) {
        requireProvider(actor);
        // Compatibility endpoint: old clients stop publishing on this code.
        throw new ApiException(HttpStatus.GONE, "PROVIDER_NOT_AVAILABLE",
                "Điều phối hiện dùng tọa độ cửa hàng. Hãy cập nhật app; không gửi GPS nền nữa.");
    }

    private void requireProvider(Actor actor) {
        if (!"provider".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PROVIDER_ROLE_REQUIRED", "Chức năng chỉ dành cho cứu hộ viên.");
        }
    }

    private ApiException providerNotReady() {
        return new ApiException(HttpStatus.FORBIDDEN, "PROVIDER_NOT_READY", "Tài khoản cứu hộ viên hoặc đội chưa được xác minh.");
    }
}

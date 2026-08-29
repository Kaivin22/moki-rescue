package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.getDouble;
import static com.danang.motorescue.service.RescueJdbcSupport.getInteger;

import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.FeedbackSummary;
import com.danang.motorescue.model.ApiModels.IncidentReportSummary;
import com.danang.motorescue.model.ApiModels.LocationPoint;
import com.danang.motorescue.model.ApiModels.QuoteSummary;
import com.danang.motorescue.model.ApiModels.RatingSummary;
import com.danang.motorescue.model.ApiModels.RequestCard;
import com.danang.motorescue.model.ApiModels.RequestDetails;
import com.danang.motorescue.model.ApiModels.ReviewSummary;
import com.danang.motorescue.model.ApiModels.RoadRouteResponse;
import com.danang.motorescue.model.ApiModels.RouteCoordinate;
import com.danang.motorescue.model.ApiModels.StatusEvent;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RescueQueryService {
    private final JdbcTemplate jdbc;
    private final RoadRoutingService routing;
    private final RescuePolicyProperties policy;
    private final MatchingProperties matchingPolicy;
    private final RescueRequestAccess access;

    public RescueQueryService(
            JdbcTemplate jdbc,
            RoadRoutingService routing,
            RescuePolicyProperties policy,
            MatchingProperties matchingPolicy,
            RescueRequestAccess access) {
        this.jdbc = jdbc;
        this.routing = routing;
        this.policy = policy;
        this.matchingPolicy = matchingPolicy;
        this.access = access;
    }

    public List<RequestCard> list(
            Actor actor,
            boolean history,
            Instant before,
            UUID beforeId,
            int requestedLimit) {
        if ((before == null) != (beforeId == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR",
                    "Cursor lịch sử phải có đủ thời gian và mã yêu cầu.");
        }
        String visibility = switch (actor.role()) {
            case "customer" -> "rr.customer_id = ?";
            case "provider" -> "rr.assigned_provider_id = ?";
            case "dispatcher", "admin" -> "TRUE";
            default -> "FALSE";
        };
        String statusFilter = history
                ? "rr.status IN ('completed', 'cancelled')"
                : "rr.status NOT IN ('completed', 'cancelled')";
        String cursorFilter = before == null ? "TRUE" : "(rr.requested_at, rr.id) < (?, ?)";
        int limit = Math.max(1, Math.min(requestedLimit, policy.requestListLimit()));
        String sql = """
                SELECT rr.id, rr.status, rr.service_code,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name,
                       rr.pickup_area_label, rr.eta_minutes,
                       EXISTS(
                         SELECT 1 FROM public.case_attention_flags flag
                         WHERE flag.request_id = rr.id AND flag.status = 'open'
                       ) AS attention_required,
                       rr.version, rr.requested_at, rr.updated_at
                FROM public.rescue_requests rr
                JOIN public.service_types service ON service.code = rr.service_code
                WHERE %s AND %s AND %s
                ORDER BY rr.requested_at DESC, rr.id DESC
                LIMIT ?
                """.formatted(visibility, statusFilter, cursorFilter);
        List<Object> args = new ArrayList<>();
        args.add(actor.locale());
        if ("customer".equals(actor.role()) || "provider".equals(actor.role())) args.add(actor.id());
        if (before != null) {
            args.add(Timestamp.from(before));
            args.add(beforeId);
        }
        args.add(limit);
        return jdbc.query(sql, (rs, rowNum) -> new RequestCard(
                rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("service_code"),
                rs.getString("service_label"), rs.getString("icon_name"), rs.getString("pickup_area_label"),
                getInteger(rs, "eta_minutes"), rs.getBoolean("attention_required"), rs.getInt("version"),
                rs.getTimestamp("requested_at").toInstant(), rs.getTimestamp("updated_at").toInstant()), args.toArray());
    }

    public RequestDetails details(Actor actor, UUID requestId) {
        RescueRequestData row = access.findForDetails(actor, requestId);

        QuoteSummary quote = jdbc.query("""
                SELECT id, version, description, amount_vnd, work_type, status, created_at
                FROM public.quotes WHERE request_id = ?
                ORDER BY version DESC LIMIT 1
                """, rs -> rs.next() ? new QuoteSummary(
                rs.getObject("id", UUID.class), rs.getShort("version"), rs.getString("description"),
                rs.getLong("amount_vnd"), rs.getString("work_type"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant()) : null, requestId);

        LocationPoint location = isTrackable(row.status()) ? jdbc.query("""
                    SELECT latitude, longitude, accuracy_m, recorded_at
                    FROM public.provider_location_checkpoints WHERE request_id = ?
                    ORDER BY recorded_at DESC LIMIT 1
                    """, rs -> rs.next() ? new LocationPoint(
                    rs.getDouble("latitude"), rs.getDouble("longitude"), getDouble(rs, "accuracy_m"),
                    rs.getTimestamp("recorded_at").toInstant()) : null, requestId) : null;
        String providerLocationStatus = !isTrackable(row.status()) ? "not_applicable"
                : location == null ? "pending"
                : location.recordedAt().isBefore(Instant.now().minusSeconds(
                        matchingPolicy.providerLocationMaxAgeSeconds())) ? "stale" : "fresh";

        List<String> attentionCodes = jdbc.query("""
                SELECT code FROM public.case_attention_flags
                WHERE request_id = ? AND status = 'open'
                ORDER BY detected_at, code
                """, (rs, rowNum) -> rs.getString("code"), requestId);

        List<FeedbackSummary> feedback = jdbc.query("""
                SELECT action, reason_code, note, created_at
                FROM public.request_feedback_events
                WHERE request_id = ? ORDER BY created_at
                """, (rs, rowNum) -> new FeedbackSummary(
                rs.getString("action"), rs.getString("reason_code"), rs.getString("note"),
                rs.getTimestamp("created_at").toInstant()), requestId);

        boolean staff = "dispatcher".equals(actor.role()) || "admin".equals(actor.role());
        List<IncidentReportSummary> incidents = "provider".equals(actor.role())
                ? List.of()
                : jdbc.query("""
                    SELECT id, category, description, status, created_at, resolution_note, resolved_at
                    FROM public.incident_reports
                    WHERE request_id = ? AND (customer_id = ? OR ?)
                    ORDER BY created_at DESC
                    """, (rs, rowNum) -> new IncidentReportSummary(
                        rs.getObject("id", UUID.class), rs.getString("category"), rs.getString("description"),
                        rs.getString("status"), rs.getTimestamp("created_at").toInstant(),
                        rs.getString("resolution_note"), rs.getTimestamp("resolved_at") == null
                                ? null : rs.getTimestamp("resolved_at").toInstant()),
                    requestId, actor.id(), staff);

        ReviewSummary review = jdbc.query("""
                SELECT rating, comment, updated_at FROM public.reviews WHERE request_id = ?
                """, rs -> rs.next() ? new ReviewSummary(
                rs.getShort("rating"), rs.getString("comment"), rs.getTimestamp("updated_at").toInstant()) : null,
                requestId);

        RatingSummary providerRating = ratingForProvider(row.assignedProviderId());
        RatingSummary teamRating = ratingForTeam(requestId);

        List<StatusEvent> events = jdbc.query("""
                SELECT from_status, to_status, created_at
                FROM public.request_status_events WHERE request_id = ?
                ORDER BY created_at
                """, (rs, index) -> new StatusEvent(
                rs.getString("from_status"), rs.getString("to_status"), rs.getTimestamp("created_at").toInstant()), requestId);

        boolean maskClosedProviderLocation = "provider".equals(actor.role()) && !isTrackable(row.status());
        boolean maskOperationalCancellation = "operational".equals(row.cancellationStage()) && !staff;
        String visibleProviderContactPhone = isTrackable(row.status()) ? row.providerContactPhone() : null;
        double visibleLatitude = maskClosedProviderLocation ? roundCoordinate(row.pickupLatitude()) : row.pickupLatitude();
        double visibleLongitude = maskClosedProviderLocation ? roundCoordinate(row.pickupLongitude()) : row.pickupLongitude();
        return new RequestDetails(
                row.id(), row.status(), row.serviceCode(), row.serviceLabel(), row.serviceIcon(),
                row.serviceRequiresQuote(), row.serviceRequiresDestination(), row.vehiclePowerType(),
                maskClosedProviderLocation ? null : row.vehicleDescription(),
                row.workType(),
                row.pickupAreaLabel(), maskClosedProviderLocation ? null : row.pickupNote(), visibleLatitude, visibleLongitude,
                row.destinationAreaLabel(), maskClosedProviderLocation ? null : row.destinationNote(),
                maskClosedProviderLocation && row.destinationLatitude() != null
                        ? roundCoordinate(row.destinationLatitude()) : row.destinationLatitude(),
                maskClosedProviderLocation && row.destinationLongitude() != null
                        ? roundCoordinate(row.destinationLongitude()) : row.destinationLongitude(),
                row.assignedProviderId(), row.providerName(), visibleProviderContactPhone,
                row.providerTeamName(), row.rescueVehicleLabel(),
                row.roadDistanceM(), row.etaMinutes(),
                row.routingStatus(), maskClosedProviderLocation ? "approximate" : row.locationPrecision(),
                maskOperationalCancellation ? null : row.cancellationCode(), row.cancellationStage(),
                maskOperationalCancellation ? null : row.cancellationReason(),
                row.lateCancellation(), staff ? row.providerNearPickupOnCancel() : null,
                row.version(), row.requestedAt(), row.updatedAt(), providerRating, teamRating,
                quote, review, location, providerLocationStatus, attentionCodes, feedback, incidents, events);
    }

    public RoadRouteResponse roadRoute(Actor actor, UUID requestId) {
        RescueRequestData request = access.requireParticipant(actor, requestId);
        if (!isTrackable(request.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "ROUTE_NOT_ACTIVE", "Tuyến theo dõi đã dừng vì ca không còn hoạt động.");
        }
        if (request.assignedProviderId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_NOT_ASSIGNED", "Yêu cầu chưa có cứu hộ viên.");
        }
        LocationPoint provider = jdbc.query("""
                SELECT latitude, longitude, accuracy_m, recorded_at
                FROM public.provider_location_checkpoints
                WHERE request_id = ? ORDER BY recorded_at DESC LIMIT 1
                """, rs -> rs.next() ? new LocationPoint(
                rs.getDouble("latitude"), rs.getDouble("longitude"), getDouble(rs, "accuracy_m"),
                rs.getTimestamp("recorded_at").toInstant()) : null, requestId);
        if (provider == null) {
            throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_LOCATION_PENDING", "Chưa nhận được vị trí mới của cứu hộ viên.");
        }
        if (provider.recordedAt().isBefore(Instant.now().minusSeconds(
                matchingPolicy.providerLocationMaxAgeSeconds()))) {
            throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_LOCATION_STALE",
                    "Vị trí cứu hộ viên đã quá cũ; tuyến đường tạm dừng cho đến khi GPS cập nhật lại.");
        }
        if (provider.accuracyM() == null
                || provider.accuracyM() > matchingPolicy.providerLocationMaxAccuracyMeters()) {
            throw new ApiException(HttpStatus.CONFLICT, "PROVIDER_LOCATION_INACCURATE",
                    "Vị trí cứu hộ viên chưa đủ chính xác để tính tuyến đường.");
        }
        boolean transportLeg = "transporting".equals(request.status())
                || ("awaiting_completion".equals(request.status()) && "transport".equals(request.workType()));
        if (transportLeg && request.destinationLatitude() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "DESTINATION_REQUIRED",
                    "Ca vận chuyển chưa có điểm giao xe hợp lệ.");
        }
        double targetLatitude = transportLeg ? request.destinationLatitude() : request.pickupLatitude();
        double targetLongitude = transportLeg ? request.destinationLongitude() : request.pickupLongitude();
        RoadRoutingService.RoadRoute route = routing.routeWithGeometry(
                        provider.latitude(), provider.longitude(), targetLatitude, targetLongitude)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ROUTING_UNAVAILABLE",
                        "Dịch vụ tuyến đường xe máy đang tạm thời không khả dụng."));
        return new RoadRouteResponse(transportLeg ? "to_destination" : "to_pickup",
                route.distanceMeters(), route.durationSeconds(), route.coordinates().stream()
                .map(point -> new RouteCoordinate(point.latitude(), point.longitude()))
                .toList());
    }

    private RatingSummary ratingForProvider(UUID providerId) {
        if (providerId == null) return new RatingSummary(null, 0);
        return jdbc.query("""
                SELECT ROUND(AVG(rating)::NUMERIC, 2) AS average_rating,
                       COUNT(*)::INTEGER AS rating_count
                FROM public.reviews
                WHERE provider_id = ? AND NOT is_hidden
                """, rs -> {
            rs.next();
            var average = rs.getBigDecimal("average_rating");
            return new RatingSummary(average == null ? null : average.doubleValue(), rs.getInt("rating_count"));
        }, providerId);
    }

    private RatingSummary ratingForTeam(UUID requestId) {
        return jdbc.query("""
                SELECT ROUND(AVG(review.rating)::NUMERIC, 2) AS average_rating,
                       COUNT(review.id)::INTEGER AS rating_count
                FROM public.rescue_requests rr
                LEFT JOIN public.reviews review
                  ON review.team_id = rr.assigned_team_id AND NOT review.is_hidden
                WHERE rr.id = ?
                """, rs -> {
            rs.next();
            var average = rs.getBigDecimal("average_rating");
            return new RatingSummary(average == null ? null : average.doubleValue(), rs.getInt("rating_count"));
        }, requestId);
    }

    private boolean isTrackable(String status) {
        return List.of("assigned", "en_route", "awaiting_arrival_confirmation", "arrived", "diagnosing",
                "awaiting_quote", "quote_approved", "repairing", "transporting", "awaiting_completion").contains(status);
    }

    private double roundCoordinate(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

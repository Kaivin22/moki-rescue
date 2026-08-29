package com.danang.motorescue.service;

import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.config.CaseLifecycleProperties;
import com.danang.motorescue.model.ApiModels.CancelRequest;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.model.ApiModels.DestinationRequest;
import com.danang.motorescue.model.ApiModels.FeedbackSummary;
import com.danang.motorescue.model.ApiModels.LocationPoint;
import com.danang.motorescue.model.ApiModels.IncidentReportRequest;
import com.danang.motorescue.model.ApiModels.IncidentReportSummary;
import com.danang.motorescue.model.ApiModels.QuoteDecisionRequest;
import com.danang.motorescue.model.ApiModels.QuoteRequest;
import com.danang.motorescue.model.ApiModels.QuoteSummary;
import com.danang.motorescue.model.ApiModels.RequestCard;
import com.danang.motorescue.model.ApiModels.RequestDetails;
import com.danang.motorescue.model.ApiModels.ReviewRequest;
import com.danang.motorescue.model.ApiModels.ReviewSummary;
import com.danang.motorescue.model.ApiModels.RatingSummary;
import com.danang.motorescue.model.ApiModels.RoadRouteResponse;
import com.danang.motorescue.model.ApiModels.RouteCoordinate;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.model.ApiModels.StatusEvent;
import com.danang.motorescue.model.ApiModels.SupportRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueService {
    private record Created(UUID id, boolean inserted) {}
    private record ServicePolicy(boolean requiresDestination) {}
    private record QuoteDecision(String workType, boolean hasDestination) {}
    private record LateCancellationSummary(int count, boolean cooldownActive) {}
    private record RequestRow(
            UUID id, UUID customerId, String status, String serviceCode, String serviceLabel,
            String serviceIcon, boolean serviceRequiresQuote, boolean serviceRequiresDestination, String vehiclePowerType,
            String vehicleDescription, String workType, String pickupAreaLabel, String pickupNote,
            double pickupLatitude, double pickupLongitude, String destinationAreaLabel, String destinationNote,
            Double destinationLatitude, Double destinationLongitude, UUID assignedProviderId,
            String providerName, String providerContactPhone, String providerTeamName, String rescueVehicleLabel,
            Integer roadDistanceM, Integer etaMinutes, String routingStatus,
            String locationPrecision, String cancellationCode, String cancellationStage,
            String cancellationReason, boolean lateCancellation, Boolean providerNearPickupOnCancel,
            int version, Instant requestedAt, Instant updatedAt) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final RequestStateMachine stateMachine;
    private final ServiceAreaService serviceArea;
    private final AuditService audit;
    private final RoadRoutingService routing;
    private final PushNotificationService push;
    private final RescuePolicyProperties policy;
    private final QualityService quality;
    private final CancellationPolicy cancellationPolicy;
    private final MatchingProperties matchingPolicy;
    private final CaseLifecycleProperties lifecyclePolicy;

    public RescueService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            RequestStateMachine stateMachine,
            ServiceAreaService serviceArea,
            AuditService audit,
            RoadRoutingService routing,
            PushNotificationService push,
            RescuePolicyProperties policy,
            QualityService quality,
            CancellationPolicy cancellationPolicy,
            MatchingProperties matchingPolicy,
            CaseLifecycleProperties lifecyclePolicy) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.stateMachine = stateMachine;
        this.serviceArea = serviceArea;
        this.audit = audit;
        this.routing = routing;
        this.push = push;
        this.policy = policy;
        this.quality = quality;
        this.cancellationPolicy = cancellationPolicy;
        this.matchingPolicy = matchingPolicy;
        this.lifecyclePolicy = lifecyclePolicy;
    }

    public RequestDetails create(Actor actor, UUID idempotencyKey, CreateRequest input) {
        requireCustomer(actor);
        if (Boolean.TRUE.equals(input.hasInjury()) || Boolean.TRUE.equals(input.hasImmediateHazard())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EMERGENCY_HANDOFF_REQUIRED",
                    "Trường hợp có người bị thương, cháy, rò rỉ hoặc nguy cơ tiếp diễn phải liên hệ 113, 114 hoặc 115 trước.");
        }
        if (!input.safetyAcknowledged()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAFETY_NOT_ACKNOWLEDGED",
                    "Hãy xác nhận bạn đang ở vị trí an toàn trước khi gửi yêu cầu.");
        }
        if ("gps".equals(input.pickupSource())
                && (input.pickupAccuracyM() == null
                || input.pickupAccuracyM() > policy.customerGpsMaxAccuracyMeters())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "LOCATION_NOT_ACCURATE",
                    "GPS chưa đủ chính xác. Hãy thử lại ở nơi thoáng hoặc tự ghim đúng điểm trên bản đồ.");
        }
        if (!serviceArea.contains(input.latitude(), input.longitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OUTSIDE_SERVICE_AREA",
                    "Vị trí hiện nằm ngoài vùng phục vụ đang vận hành.");
        }
        validateDestinationInput(input.destinationAreaLabel(), input.destinationLatitude(),
                input.destinationLongitude());
        if (input.destinationLatitude() != null
                && !serviceArea.contains(input.destinationLatitude(), input.destinationLongitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_OUTSIDE_SERVICE_AREA",
                    "Điểm giao xe nằm ngoài vùng phục vụ đang vận hành.");
        }
        if (input.destinationLatitude() != null
                && distanceMeters(input.latitude(), input.longitude(), input.destinationLatitude(),
                        input.destinationLongitude()) < 50) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_TOO_CLOSE",
                    "Điểm giao xe phải cách điểm đón ít nhất 50 mét.");
        }

        Created created = transactions.execute(status -> {
            Created result = createInTransaction(actor.id(), idempotencyKey, input);
            if (result.inserted()) audit.record(actor.id(), "request.created", "rescue_request", result.id());
            return result;
        });
        if (created == null) throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "CREATE_FAILED", "Không thể tạo yêu cầu.");
        if (created.inserted()) {
            dispatch.match(created.id());
        }
        return details(actor, created.id());
    }

    private Created createInTransaction(UUID customerId, UUID idempotencyKey, CreateRequest input) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", Long.class, customerId.toString());

        Created existing = jdbc.query("""
                SELECT id, service_code, vehicle_power_type, vehicle_description,
                       pickup_area_label, pickup_note, pickup_latitude, pickup_longitude,
                       pickup_source, pickup_accuracy_m, destination_area_label, destination_note,
                       destination_latitude, destination_longitude
                FROM public.rescue_requests WHERE customer_id = ? AND idempotency_key = ?
                """, rs -> {
            if (!rs.next()) return null;
            boolean samePayload = input.serviceCode().equals(rs.getString("service_code"))
                    && input.vehiclePowerType().equals(rs.getString("vehicle_power_type"))
                    && Objects.equals(clean(input.vehicleDescription()), rs.getString("vehicle_description"))
                    && input.pickupAreaLabel().trim().equals(rs.getString("pickup_area_label"))
                    && Objects.equals(clean(input.pickupNote()), rs.getString("pickup_note"))
                    && Math.abs(input.latitude() - rs.getDouble("pickup_latitude")) < 0.00001
                    && Math.abs(input.longitude() - rs.getDouble("pickup_longitude")) < 0.00001
                    && input.pickupSource().equals(rs.getString("pickup_source"))
                    && sameCoordinate(input.pickupAccuracyM(), getDouble(rs, "pickup_accuracy_m"))
                    && Objects.equals(clean(input.destinationAreaLabel()), rs.getString("destination_area_label"))
                    && Objects.equals(clean(input.destinationNote()), rs.getString("destination_note"))
                    && sameCoordinate(input.destinationLatitude(), getDouble(rs, "destination_latitude"))
                    && sameCoordinate(input.destinationLongitude(), getDouble(rs, "destination_longitude"));
            if (!samePayload) {
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED",
                        "Mã gửi lại đã được dùng cho một yêu cầu khác.");
            }
            return new Created(rs.getObject("id", UUID.class), false);
        }, customerId, idempotencyKey);
        if (existing != null) return existing;

        ServicePolicy servicePolicy = jdbc.query("""
                SELECT requires_destination FROM public.service_types
                WHERE code = ? AND is_active
                """, rs -> rs.next() ? new ServicePolicy(rs.getBoolean("requires_destination")) : null,
                input.serviceCode());
        if (servicePolicy == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_NOT_AVAILABLE", "Loại hỗ trợ không khả dụng.");
        }
        if (servicePolicy.requiresDestination() && input.destinationLatitude() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DESTINATION_REQUIRED",
                    "Dịch vụ này cần điểm giao xe trước khi gửi yêu cầu.");
        }

        Integer activeCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.rescue_requests
                WHERE customer_id = ? AND status NOT IN ('completed', 'cancelled')
                """, Integer.class, customerId);
        if (activeCount != null && activeCount > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_REQUEST_EXISTS",
                    "Bạn đang có một yêu cầu chưa kết thúc. Hãy xử lý yêu cầu đó trước.");
        }

        LateCancellationSummary lateCancellations = jdbc.query("""
                SELECT COUNT(*)::INTEGER AS cancellation_count,
                       COALESCE(MAX(cancelled_at) >= NOW() - (? * INTERVAL '1 second'), FALSE) AS cooldown_active
                FROM public.rescue_requests
                WHERE customer_id = ? AND is_late_cancellation
                  AND (
                    cancellation_code <> 'provider_not_present'
                    OR provider_near_pickup_on_cancel IS TRUE
                  )
                  AND cancelled_at >= NOW() - (? * INTERVAL '1 second')
                """, rs -> {
            rs.next();
            return new LateCancellationSummary(rs.getInt("cancellation_count"), rs.getBoolean("cooldown_active"));
        }, policy.lateCancellationCooldown().toSeconds(), customerId,
                policy.lateCancellationWindow().toSeconds());
        if (lateCancellations.count() >= policy.maxLateCancellations() && lateCancellations.cooldownActive()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "LATE_CANCELLATION_COOLDOWN",
                    "Bạn đã hủy muộn nhiều lần gần đây. Hãy liên hệ điều phối nếu đang cần hỗ trợ khẩn cấp.");
        }

        Integer recentCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.rescue_requests
                WHERE customer_id = ? AND requested_at >= NOW() - (? * INTERVAL '1 second')
                """, Integer.class, customerId, policy.createWindow().toSeconds());
        if (recentCount != null && recentCount >= policy.maxCreatesPerWindow()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "REQUEST_RATE_LIMITED",
                    "Bạn đã tạo quá nhiều yêu cầu trong thời gian ngắn. Hãy thử lại sau.");
        }

        UUID id = jdbc.queryForObject("""
                INSERT INTO public.rescue_requests(
                  customer_id, service_code, idempotency_key, vehicle_power_type,
                  vehicle_description, pickup_area_label, pickup_note,
                  pickup_latitude, pickup_longitude, pickup_source, pickup_accuracy_m,
                  destination_area_label, destination_note,
                  destination_latitude, destination_longitude, safety_acknowledged
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING id
                """, UUID.class, customerId, input.serviceCode(), idempotencyKey,
                input.vehiclePowerType(), clean(input.vehicleDescription()), input.pickupAreaLabel().trim(),
                clean(input.pickupNote()), input.latitude(), input.longitude(), input.pickupSource(),
                input.pickupAccuracyM(), clean(input.destinationAreaLabel()),
                clean(input.destinationNote()), input.destinationLatitude(), input.destinationLongitude());
        return new Created(id, true);
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
        RequestRow row = Optional.ofNullable(jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote, service.requires_destination,
                       provider.display_name AS provider_name,
                       provider.contact_phone_e164 AS provider_contact_phone,
                       provider.rescue_vehicle_label, team.name AS provider_team_name
                FROM public.rescue_requests rr
                JOIN public.service_types service ON service.code = rr.service_code
                LEFT JOIN public.provider_members provider ON provider.user_id = rr.assigned_provider_id
                 LEFT JOIN public.rescue_teams team ON team.id = rr.assigned_team_id
                WHERE rr.id = ?
                  AND (rr.customer_id = ? OR rr.assigned_provider_id = ? OR ? IN ('dispatcher', 'admin'))
                """, rs -> rs.next() ? mapRequest(rs) : null,
                actor.locale(), requestId, actor.id(), actor.id(), actor.role()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu cứu hộ."));

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

    public RequestDetails cancel(Actor actor, UUID requestId, CancelRequest input) {
        RequestRow current = requireParticipant(actor, requestId);
        boolean active = !List.of("completed", "cancelled").contains(current.status());
        boolean allowed = switch (actor.role()) {
            case "customer" -> current.customerId().equals(actor.id()) && List.of(
                    "searching", "offered", "assigned", "en_route", "awaiting_arrival_confirmation", "no_provider"
            ).contains(current.status());
            case "provider" -> false;
            case "dispatcher", "admin" -> active;
            default -> false;
        };
        if (!allowed) throw invalidAction();
        CancellationPolicy.Decision decision = cancellationPolicy.evaluate(
                actor.role(), current.status(), input.reasonCode(), input.note());
        Boolean providerNearPickup = decision.late() ? providerNearPickup(requestId) : null;
        String cancellationNote = clean(input.note());

        int changed = transactions.execute(status -> {
            setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET status = 'cancelled', cancellation_code = ?, cancellation_stage = ?,
                        cancellation_reason = ?, is_late_cancellation = ?,
                        provider_near_pickup_on_cancel = ?, cancelled_by = ?
                    WHERE id = ? AND status = ? AND version = ?
                    """, input.reasonCode(), decision.stage(), cancellationNote, decision.late(),
                    providerNearPickup, actor.id(), requestId, current.status(), input.expectedVersion());
            if (updated > 0) {
                jdbc.update("UPDATE public.dispatch_offers SET status = 'withdrawn' WHERE request_id = ? AND status = 'pending'", requestId);
                if (current.assignedProviderId() != null) {
                    jdbc.update("""
                            UPDATE public.provider_members
                            SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                                location_accuracy_m = NULL
                            WHERE user_id = ?
                            """, current.assignedProviderId());
                }
                String action = decision.arrivalDisputed()
                        ? "request.arrival_disputed_cancelled"
                        : decision.late() ? "request.late_cancelled_by_customer"
                        : "request.cancelled_by_" + actor.role();
                audit.record(actor.id(), action, "rescue_request", requestId);
            }
            return updated;
        });
        if (changed == 0) throw stale();
        if ("dispatcher".equals(actor.role()) || "admin".equals(actor.role())) {
            notifyParticipants(requestId, NotificationKind.REQUEST_CANCELLED, actor.role());
        } else {
            notifyCounterparty(actor, requestId, NotificationKind.REQUEST_CANCELLED, actor.role());
        }
        return details(actor, requestId);
    }

    public RequestDetails retryDispatch(Actor actor, UUID requestId) {
        requireCustomer(actor);
        int changed = transactions.execute(status -> {
            setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests rr
                    SET status = 'searching', routing_status = 'pending',
                        customer_retry_count = customer_retry_count + 1,
                        last_customer_retry_at = NOW()
                    FROM public.service_types service
                    WHERE rr.id = ? AND rr.customer_id = ? AND rr.status = 'no_provider'
                      AND service.code = rr.service_code AND service.is_active
                      AND rr.customer_retry_count < ?
                      AND (rr.last_customer_retry_at IS NULL
                        OR rr.last_customer_retry_at < NOW() - (? * INTERVAL '1 second'))
                    """, requestId, actor.id(), lifecyclePolicy.maxCustomerRetries(),
                    lifecyclePolicy.customerRetryCooldown().toSeconds());
            if (updated > 0) audit.record(actor.id(), "dispatch.customer_retry", "rescue_request", requestId);
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "REQUEST_RETRY_LIMITED",
                    "Chưa thể tìm lại đội. Hãy đợi hết thời gian chờ hoặc liên hệ điều phối viên.");
        }
        dispatch.match(requestId);
        return details(actor, requestId);
    }

    public void requestSupport(Actor actor, UUID requestId, SupportRequest input) {
        requireCustomer(actor);
        RequestRow current = requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id())
                || List.of("completed", "cancelled").contains(current.status())) {
            throw invalidAction();
        }
        String note = clean(input.note());
        if ("other".equals(input.reasonCode()) && (note == null || note.length() < 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SUPPORT_REASON_REQUIRED",
                    "Hãy mô tả nội dung cần hỗ trợ bằng ít nhất 5 ký tự.");
        }
        String context = note == null ? input.reasonCode() : input.reasonCode() + ": " + note;
        int inserted = transactions.execute(status -> {
            setActor(actor.id());
            int changed = jdbc.update("""
                    INSERT INTO public.case_attention_flags(request_id, code, context_note)
                    VALUES (?, 'customer_support_requested', ?)
                    ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                    """, requestId, context);
            if (changed > 0) audit.record(actor.id(), "support.requested", "rescue_request", requestId);
            return changed;
        });
        if (inserted > 0) {
            push.notifyStaff(NotificationKind.SUPPORT_REQUESTED, input.reasonCode(), requestId);
        }
    }

    public void reportIncident(Actor actor, UUID requestId, IncidentReportRequest input) {
        requireCustomer(actor);
        RequestRow current = requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id()) || current.assignedProviderId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "INCIDENT_NOT_ALLOWED",
                    "Chỉ có thể báo sự cố sau khi một đội cứu hộ đã nhận ca.");
        }
        int inserted = transactions.execute(status -> {
            setActor(actor.id());
            int changed = jdbc.update("""
                    INSERT INTO public.incident_reports(
                      request_id, customer_id, team_id, provider_id, category, description
                    )
                    SELECT id, customer_id, assigned_team_id, assigned_provider_id, ?, ?
                    FROM public.rescue_requests
                    WHERE id = ? AND customer_id = ? AND assigned_team_id IS NOT NULL
                    ON CONFLICT (request_id, customer_id, category) DO NOTHING
                    """, input.category(), input.description().trim(), requestId, actor.id());
            if (changed > 0) {
                jdbc.update("""
                        INSERT INTO public.case_attention_flags(request_id, code, context_note)
                        VALUES (?, 'customer_incident_reported', ?)
                        ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                        """, requestId, input.category());
                audit.record(actor.id(), "incident.reported", "rescue_request", requestId);
            }
            return changed;
        });
        if (inserted == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INCIDENT_ALREADY_REPORTED",
                    "Bạn đã gửi nội dung thuộc nhóm này cho ca hiện tại.");
        }
        push.notifyStaff(NotificationKind.SUPPORT_REQUESTED, "incident_report", requestId);
    }

    public RequestDetails act(Actor actor, UUID requestId, StateActionRequest input) {
        if (input.expectedVersion() == null) throw stale();
        RequestRow current = requireParticipant(actor, requestId);
        boolean feedbackAction = List.of("reject_arrival", "reject_repair", "reject_transport")
                .contains(input.action());
        if (feedbackAction) validateFeedback(input.action(), input.reasonCode(), input.note());
        String next;
        String nextWorkType = current.workType();
        if ("start_work".equals(input.action())) {
            if (!"provider".equals(actor.role())) {
                throw invalidAction();
            }
            if ("quote_approved".equals(current.status())) {
                if (current.workType() == null
                        || (input.workType() != null && !input.workType().equals(current.workType()))) {
                    throw invalidAction();
                }
                nextWorkType = current.workType();
            } else if ("diagnosing".equals(current.status())
                    && !current.serviceRequiresQuote() && input.workType() != null) {
                nextWorkType = input.workType();
            } else {
                throw invalidAction();
            }
            if ("transport".equals(nextWorkType) && current.destinationLatitude() == null) {
                throw new ApiException(HttpStatus.CONFLICT, "DESTINATION_REQUIRED",
                        "Khách hàng phải xác nhận điểm giao xe trước khi bắt đầu vận chuyển.");
            }
            next = "transport".equals(nextWorkType) ? "transporting" : "repairing";
        } else {
            if ("awaiting_completion".equals(current.status())
                    && ("reject_repair".equals(input.action()) || "reject_transport".equals(input.action()))) {
                String requestedWorkType = "reject_transport".equals(input.action()) ? "transport" : "repair";
                if (!requestedWorkType.equals(current.workType())) throw invalidAction();
            }
            next = stateMachine.next(actor.role(), current.status(), input.action());
        }

        String workTypeToPersist = nextWorkType;

        int changed = transactions.execute(status -> {
            setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests SET status = ?, work_type = ?
                    WHERE id = ? AND version = ?
                      AND (customer_id = ? OR assigned_provider_id = ?)
                    """, next, workTypeToPersist, requestId, input.expectedVersion(), actor.id(), actor.id());
            if (updated > 0 && "completed".equals(next) && current.assignedProviderId() != null) {
                jdbc.update("""
                        UPDATE public.provider_members
                        SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                            location_accuracy_m = NULL
                        WHERE user_id = ?
                        """, current.assignedProviderId());
            }
            if (updated > 0 && feedbackAction) {
                jdbc.update("""
                        INSERT INTO public.request_feedback_events(request_id, actor_id, action, reason_code, note)
                        VALUES (?, ?, ?, ?, ?)
                        """, requestId, actor.id(), input.action(), input.reasonCode(), clean(input.note()));
                Integer feedbackCount = jdbc.queryForObject("""
                        SELECT COUNT(*) FROM public.request_feedback_events
                        WHERE request_id = ? AND action = ?
                        """, Integer.class, requestId, input.action());
                if (feedbackCount != null && feedbackCount >= 2) {
                    String attentionCode = "reject_arrival".equals(input.action())
                            ? "arrival_dispute" : "completion_dispute";
                    jdbc.update("""
                            INSERT INTO public.case_attention_flags(request_id, code, context_note)
                            VALUES (?, ?, ?)
                            ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                            """, requestId, attentionCode, "Khách đã từ chối xác nhận từ hai lần trở lên.");
                }
            }
            if (updated > 0) audit.record(actor.id(), "request." + input.action(), "rescue_request", requestId);
            return updated;
        });
        if (changed == 0) throw stale();
        notifyCounterparty(actor, requestId, NotificationKind.STATUS_CHANGED, next);
        return details(actor, requestId);
    }

    public RequestDetails submitQuote(Actor actor, UUID requestId, QuoteRequest input) {
        if (!"provider".equals(actor.role())) throw forbidden();
        int changed = transactions.execute(status -> {
            setActor(actor.id());
            Integer lockedVersion = jdbc.query("""
                    SELECT version FROM public.rescue_requests
                    WHERE id = ? AND assigned_provider_id = ?
                      AND status = 'diagnosing' AND version = ?
                    FOR UPDATE
                    """, rs -> rs.next() ? rs.getInt(1) : null,
                    requestId, actor.id(), input.expectedRequestVersion());
            if (lockedVersion == null) return 0;
            Integer nextVersion = jdbc.queryForObject(
                    "SELECT COALESCE(MAX(version), 0) + 1 FROM public.quotes WHERE request_id = ?",
                    Integer.class, requestId);
            jdbc.update("UPDATE public.quotes SET status = 'superseded' WHERE request_id = ? AND status = 'pending'", requestId);
            jdbc.update("""
                    INSERT INTO public.quotes(request_id, provider_id, version, description, amount_vnd, work_type)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, requestId, actor.id(), nextVersion, input.description().trim(), input.amountVnd(), input.workType());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests SET status = 'awaiting_quote'
                    WHERE id = ? AND status = 'diagnosing' AND version = ?
                    """, requestId, input.expectedRequestVersion());
            if (updated > 0) audit.record(actor.id(), "quote.submitted", "rescue_request", requestId);
            return updated;
        });
        if (changed == 0) throw stale();
        notifyCounterparty(actor, requestId, NotificationKind.QUOTE_SUBMITTED, null);
        return details(actor, requestId);
    }

    public RequestDetails decideQuote(Actor actor, UUID requestId, UUID quoteId, QuoteDecisionRequest input) {
        requireCustomer(actor);
        int changed = transactions.execute(status -> {
            setActor(actor.id());
            QuoteDecision quoteDecision = jdbc.query("""
                    SELECT quote.work_type, rr.destination_location IS NOT NULL AS has_destination
                    FROM public.quotes quote
                    JOIN public.rescue_requests rr ON rr.id = quote.request_id
                    WHERE quote.id = ? AND quote.request_id = ? AND quote.status = 'pending'
                      AND rr.customer_id = ? AND rr.status = 'awaiting_quote' AND rr.version = ?
                    FOR UPDATE OF quote, rr
                    """, rs -> rs.next()
                            ? new QuoteDecision(rs.getString("work_type"), rs.getBoolean("has_destination"))
                            : null,
                    quoteId, requestId, actor.id(), input.expectedRequestVersion());
            if (quoteDecision == null) return 0;
            if ("transport".equals(quoteDecision.workType()) && !quoteDecision.hasDestination()) {
                throw new ApiException(HttpStatus.CONFLICT, "DESTINATION_REQUIRED",
                        "Hãy xác nhận điểm giao xe trước khi duyệt báo giá vận chuyển.");
            }
            boolean approved = "approve".equals(input.decision());
            jdbc.update("UPDATE public.quotes SET status = ?, decided_at = NOW() WHERE id = ? AND status = 'pending'",
                    approved ? "approved" : "rejected", quoteId);
            String next = approved ? "quote_approved" : "diagnosing";
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests SET status = ?, work_type = ?
                    WHERE id = ? AND status = 'awaiting_quote' AND version = ?
                    """, next, approved ? quoteDecision.workType() : null, requestId,
                    input.expectedRequestVersion());
            if (updated > 0) audit.record(actor.id(), "quote." + input.decision(), "rescue_request", requestId);
            return updated;
        });
        if (changed == 0) throw stale();
        notifyCounterparty(actor, requestId, NotificationKind.QUOTE_DECIDED, null);
        return details(actor, requestId);
    }

    public void review(Actor actor, UUID requestId, ReviewRequest input) {
        requireCustomer(actor);
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
        if (changed == 0) throw new ApiException(HttpStatus.CONFLICT, "REVIEW_NOT_ALLOWED", "Chỉ ca đã hoàn tất mới có thể được đánh giá.");
    }

    public void deleteReview(Actor actor, UUID requestId) {
        requireCustomer(actor);
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

    public RequestDetails updateDestination(Actor actor, UUID requestId, DestinationRequest input) {
        requireCustomer(actor);
        validateDestinationInput(input.areaLabel(), input.latitude(), input.longitude());
        if (!serviceArea.contains(input.latitude(), input.longitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_OUTSIDE_SERVICE_AREA",
                    "Điểm giao xe nằm ngoài vùng phục vụ đang vận hành.");
        }
        RequestRow current = requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id())
                || !List.of("arrived", "diagnosing", "awaiting_quote").contains(current.status())) {
            throw invalidAction();
        }
        if (distanceMeters(current.pickupLatitude(), current.pickupLongitude(), input.latitude(), input.longitude()) < 50) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_TOO_CLOSE",
                    "Điểm giao xe phải cách điểm đón ít nhất 50 mét.");
        }
        int changed = transactions.execute(status -> {
            setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET destination_area_label = ?, destination_note = ?,
                        destination_latitude = ?, destination_longitude = ?, version = version + 1
                    WHERE id = ? AND customer_id = ? AND status IN ('arrived', 'diagnosing', 'awaiting_quote')
                      AND version = ?
                    """, input.areaLabel().trim(), clean(input.note()), input.latitude(), input.longitude(),
                    requestId, actor.id(), input.expectedRequestVersion());
            if (updated > 0) audit.record(actor.id(), "request.destination.updated", "rescue_request", requestId);
            return updated;
        });
        if (changed == 0) throw stale();
        notifyCounterparty(actor, requestId, NotificationKind.STATUS_CHANGED, "destination_updated");
        return details(actor, requestId);
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

    public RoadRouteResponse roadRoute(Actor actor, UUID requestId) {
        RequestRow request = requireParticipant(actor, requestId);
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

    private RequestRow requireParticipant(Actor actor, UUID requestId) {
        RequestRow row = jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote, service.requires_destination,
                       provider.display_name AS provider_name,
                       provider.contact_phone_e164 AS provider_contact_phone,
                       provider.rescue_vehicle_label, team.name AS provider_team_name
                FROM public.rescue_requests rr
                JOIN public.service_types service ON service.code = rr.service_code
                LEFT JOIN public.provider_members provider ON provider.user_id = rr.assigned_provider_id
                LEFT JOIN public.rescue_teams team ON team.id = provider.team_id
                WHERE rr.id = ? AND (rr.customer_id = ? OR rr.assigned_provider_id = ? OR ? IN ('dispatcher', 'admin'))
                """, rs -> rs.next() ? mapRequest(rs) : null,
                actor.locale(), requestId, actor.id(), actor.id(), actor.role());
        if (row == null) throw forbidden();
        return row;
    }

    private RequestRow mapRequest(ResultSet rs) throws SQLException {
        return new RequestRow(
                rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class), rs.getString("status"),
                rs.getString("service_code"), rs.getString("service_label"), rs.getString("icon_name"),
                rs.getBoolean("requires_quote"), rs.getBoolean("requires_destination"),
                rs.getString("vehicle_power_type"), rs.getString("vehicle_description"),
                rs.getString("work_type"),
                rs.getString("pickup_area_label"), rs.getString("pickup_note"), rs.getDouble("pickup_latitude"),
                rs.getDouble("pickup_longitude"), rs.getString("destination_area_label"),
                rs.getString("destination_note"), getDouble(rs, "destination_latitude"),
                getDouble(rs, "destination_longitude"), rs.getObject("assigned_provider_id", UUID.class),
                rs.getString("provider_name"), rs.getString("provider_contact_phone"),
                rs.getString("provider_team_name"), rs.getString("rescue_vehicle_label"),
                getInteger(rs, "road_distance_m"), getInteger(rs, "eta_minutes"),
                rs.getString("routing_status"), rs.getString("location_precision"),
                rs.getString("cancellation_code"), rs.getString("cancellation_stage"),
                rs.getString("cancellation_reason"), rs.getBoolean("is_late_cancellation"),
                getBoolean(rs, "provider_near_pickup_on_cancel"), rs.getInt("version"), rs.getTimestamp("requested_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    private Boolean providerNearPickup(UUID requestId) {
        return jdbc.query("""
                SELECT CASE
                  WHEN checkpoint.recorded_at IS NULL
                    OR checkpoint.recorded_at < NOW() - (? * INTERVAL '1 second')
                    OR checkpoint.accuracy_m > ?
                  THEN NULL
                  ELSE extensions.ST_DWithin(
                    extensions.ST_SetSRID(
                      extensions.ST_MakePoint(checkpoint.longitude, checkpoint.latitude), 4326
                    )::extensions.geography,
                    request.pickup_location,
                    ?
                  )
                END AS provider_near_pickup
                FROM public.rescue_requests request
                LEFT JOIN LATERAL (
                  SELECT latitude, longitude, accuracy_m, recorded_at
                  FROM public.provider_location_checkpoints
                  WHERE request_id = request.id
                  ORDER BY recorded_at DESC
                  LIMIT 1
                ) checkpoint ON TRUE
                WHERE request.id = ?
                """, rs -> rs.next() ? getBoolean(rs, "provider_near_pickup") : null,
                policy.cancellationEvidenceMaxAge().toSeconds(), policy.arrivalProximityMeters(),
                policy.arrivalProximityMeters(), requestId);
    }

    private void setActor(UUID actorId) {
        jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actorId.toString());
    }

    private boolean isTrackable(String status) {
        return List.of("assigned", "en_route", "awaiting_arrival_confirmation", "arrived", "diagnosing",
                "awaiting_quote", "quote_approved", "repairing", "transporting", "awaiting_completion").contains(status);
    }

    private double roundCoordinate(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static Integer getInteger(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private static Double getDouble(ResultSet rs, String column) throws SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    private static Boolean getBoolean(ResultSet rs, String column) throws SQLException {
        boolean value = rs.getBoolean(column);
        return rs.wasNull() ? null : value;
    }

    private static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateDestinationInput(String label, Double latitude, Double longitude) {
        boolean any = clean(label) != null || latitude != null || longitude != null;
        boolean complete = clean(label) != null && latitude != null && longitude != null;
        if (any && !complete) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DESTINATION_INCOMPLETE",
                    "Điểm giao xe phải có đủ tên vị trí và tọa độ.");
        }
    }

    private void validateFeedback(String action, String reasonCode, String note) {
        List<String> allowed = "reject_arrival".equals(action)
                ? List.of("provider_not_visible", "wrong_meeting_point", "cannot_contact_provider", "other")
                : List.of("issue_persists", "work_not_as_agreed", "destination_not_reached", "other");
        if (reasonCode == null || !allowed.contains(reasonCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FEEDBACK_REASON_REQUIRED",
                    "Hãy chọn lý do phù hợp trước khi từ chối xác nhận.");
        }
        if ("other".equals(reasonCode) && (clean(note) == null || clean(note).length() < 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FEEDBACK_NOTE_REQUIRED",
                    "Hãy mô tả lý do khác bằng ít nhất 5 ký tự.");
        }
    }

    private static boolean sameCoordinate(Double first, Double second) {
        if (first == null || second == null) return first == null && second == null;
        return Math.abs(first - second) < 0.00001;
    }

    private static double distanceMeters(double firstLatitude, double firstLongitude,
            double secondLatitude, double secondLongitude) {
        double earthRadius = 6_371_000;
        double latitudeDelta = Math.toRadians(secondLatitude - firstLatitude);
        double longitudeDelta = Math.toRadians(secondLongitude - firstLongitude);
        double a = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
                + Math.cos(Math.toRadians(firstLatitude)) * Math.cos(Math.toRadians(secondLatitude))
                * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private void notifyCounterparty(Actor actor, UUID requestId, NotificationKind kind, String detail) {
        UUID target = jdbc.query("""
                SELECT CASE WHEN customer_id = ? THEN assigned_provider_id ELSE customer_id END
                FROM public.rescue_requests WHERE id = ?
                """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null, actor.id(), requestId);
        if (target != null) push.notifyUser(target, kind, detail, requestId);
    }

    private void notifyParticipants(UUID requestId, NotificationKind kind, String detail) {
        List<UUID> targets = jdbc.query("""
                SELECT participant_id FROM (
                  SELECT customer_id AS participant_id FROM public.rescue_requests WHERE id = ?
                  UNION
                  SELECT assigned_provider_id FROM public.rescue_requests WHERE id = ?
                ) participants WHERE participant_id IS NOT NULL
                """, (rs, rowNum) -> rs.getObject(1, UUID.class), requestId, requestId);
        for (UUID target : targets) push.notifyUser(target, kind, detail, requestId);
    }

    private void requireCustomer(Actor actor) {
        if (!"customer".equals(actor.role())) throw forbidden();
    }

    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "REQUEST_ACCESS_DENIED", "Bạn không có quyền với yêu cầu này.");
    }

    private ApiException stale() {
        return new ApiException(HttpStatus.CONFLICT, "REQUEST_VERSION_CONFLICT", "Yêu cầu đã thay đổi. Hãy tải lại trước khi thao tác.");
    }

    private ApiException invalidAction() {
        return new ApiException(HttpStatus.CONFLICT, "INVALID_REQUEST_ACTION", "Thao tác không phù hợp với trạng thái hiện tại.");
    }
}

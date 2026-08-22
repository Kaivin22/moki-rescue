package com.danang.motorescue.service;

import com.danang.motorescue.config.ServiceAreaProperties;
import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.CancelRequest;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.model.ApiModels.LocationPoint;
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
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueService {
    private record Created(UUID id, boolean inserted) {}
    private record RequestRow(
            UUID id, UUID customerId, String status, String serviceCode, String serviceLabel,
            String serviceIcon, boolean serviceRequiresQuote, String vehiclePowerType,
            String vehicleDescription, String workType, String pickupAreaLabel, String pickupNote,
            double pickupLatitude, double pickupLongitude, UUID assignedProviderId,
            String providerName, String providerContactPhone, String providerTeamName, String rescueVehicleLabel,
            Integer roadDistanceM, Integer etaMinutes, String routingStatus,
            String locationPrecision, int version, Instant requestedAt, Instant updatedAt) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final RequestStateMachine stateMachine;
    private final ServiceAreaProperties serviceArea;
    private final AuditService audit;
    private final RoadRoutingService routing;
    private final PushNotificationService push;
    private final RescuePolicyProperties policy;
    private final QualityService quality;

    public RescueService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            RequestStateMachine stateMachine,
            ServiceAreaProperties serviceArea,
            AuditService audit,
            RoadRoutingService routing,
            PushNotificationService push,
            RescuePolicyProperties policy,
            QualityService quality) {
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
        if (!serviceArea.contains(input.latitude(), input.longitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OUTSIDE_SERVICE_AREA",
                    "Vị trí hiện nằm ngoài vùng phục vụ đang vận hành.");
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
                SELECT id, service_code, vehicle_power_type, pickup_latitude, pickup_longitude
                FROM public.rescue_requests WHERE customer_id = ? AND idempotency_key = ?
                """, rs -> {
            if (!rs.next()) return null;
            boolean samePayload = input.serviceCode().equals(rs.getString("service_code"))
                    && input.vehiclePowerType().equals(rs.getString("vehicle_power_type"))
                    && Math.abs(input.latitude() - rs.getDouble("pickup_latitude")) < 0.00001
                    && Math.abs(input.longitude() - rs.getDouble("pickup_longitude")) < 0.00001;
            if (!samePayload) {
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED",
                        "Mã gửi lại đã được dùng cho một yêu cầu khác.");
            }
            return new Created(rs.getObject("id", UUID.class), false);
        }, customerId, idempotencyKey);
        if (existing != null) return existing;

        Boolean serviceExists = jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM public.service_types WHERE code = ? AND is_active)",
                Boolean.class, input.serviceCode());
        if (!Boolean.TRUE.equals(serviceExists)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVICE_NOT_AVAILABLE", "Loại hỗ trợ không khả dụng.");
        }

        Integer activeCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM public.rescue_requests
                WHERE customer_id = ? AND status NOT IN ('completed', 'cancelled')
                """, Integer.class, customerId);
        if (activeCount != null && activeCount > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_REQUEST_EXISTS",
                    "Bạn đang có một yêu cầu chưa kết thúc. Hãy xử lý yêu cầu đó trước.");
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
                  pickup_latitude, pickup_longitude, safety_acknowledged
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING id
                """, UUID.class, customerId, input.serviceCode(), idempotencyKey,
                input.vehiclePowerType(), clean(input.vehicleDescription()), input.pickupAreaLabel().trim(),
                clean(input.pickupNote()), input.latitude(), input.longitude());
        return new Created(id, true);
    }

    public List<RequestCard> list(Actor actor, boolean history) {
        String visibility = switch (actor.role()) {
            case "customer" -> "rr.customer_id = ?";
            case "provider" -> "rr.assigned_provider_id = ?";
            case "dispatcher", "admin" -> "TRUE";
            default -> "FALSE";
        };
        String statusFilter = history
                ? "rr.status IN ('completed', 'cancelled')"
                : "rr.status NOT IN ('completed', 'cancelled')";
        String sql = """
                SELECT rr.id, rr.status, rr.service_code,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name,
                       rr.pickup_area_label, rr.eta_minutes, rr.version, rr.requested_at, rr.updated_at
                FROM public.rescue_requests rr
                JOIN public.service_types service ON service.code = rr.service_code
                WHERE %s AND %s
                ORDER BY rr.requested_at DESC
                LIMIT %d
                """.formatted(visibility, statusFilter, policy.requestListLimit());
        Object[] args = switch (actor.role()) {
            case "customer", "provider" -> new Object[]{actor.locale(), actor.id()};
            default -> new Object[]{actor.locale()};
        };
        return jdbc.query(sql, (rs, rowNum) -> new RequestCard(
                rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("service_code"),
                rs.getString("service_label"), rs.getString("icon_name"), rs.getString("pickup_area_label"),
                getInteger(rs, "eta_minutes"), rs.getInt("version"),
                rs.getTimestamp("requested_at").toInstant(), rs.getTimestamp("updated_at").toInstant()), args);
    }

    public RequestDetails details(Actor actor, UUID requestId) {
        RequestRow row = Optional.ofNullable(jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote,
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
        String visibleProviderContactPhone = isTrackable(row.status()) ? row.providerContactPhone() : null;
        double visibleLatitude = maskClosedProviderLocation ? roundCoordinate(row.pickupLatitude()) : row.pickupLatitude();
        double visibleLongitude = maskClosedProviderLocation ? roundCoordinate(row.pickupLongitude()) : row.pickupLongitude();
        return new RequestDetails(
                row.id(), row.status(), row.serviceCode(), row.serviceLabel(), row.serviceIcon(),
                row.serviceRequiresQuote(), row.vehiclePowerType(), maskClosedProviderLocation ? null : row.vehicleDescription(),
                row.workType(),
                row.pickupAreaLabel(), maskClosedProviderLocation ? null : row.pickupNote(), visibleLatitude, visibleLongitude,
                row.assignedProviderId(), row.providerName(), visibleProviderContactPhone,
                row.providerTeamName(), row.rescueVehicleLabel(),
                row.roadDistanceM(), row.etaMinutes(),
                row.routingStatus(), maskClosedProviderLocation ? "approximate" : row.locationPrecision(),
                row.version(), row.requestedAt(), row.updatedAt(), providerRating, teamRating,
                quote, review, location, events);
    }

    public RequestDetails cancel(Actor actor, UUID requestId, CancelRequest input) {
        RequestRow current = requireParticipant(actor, requestId);
        boolean active = !List.of("completed", "cancelled").contains(current.status());
        boolean allowed = switch (actor.role()) {
            case "customer" -> current.customerId().equals(actor.id()) && List.of(
                    "searching", "offered", "assigned", "en_route", "awaiting_arrival_confirmation", "no_provider"
            ).contains(current.status());
            case "provider" -> actor.id().equals(current.assignedProviderId()) && active;
            case "dispatcher", "admin" -> active;
            default -> false;
        };
        if (!allowed) throw invalidAction();

        int changed = transactions.execute(status -> {
            setActor(actor.id());
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests
                    SET status = 'cancelled', cancellation_reason = ?
                    WHERE id = ? AND status = ? AND version = ?
                    """, input.reason().trim(), requestId, current.status(), input.expectedVersion());
            if (updated > 0) {
                jdbc.update("UPDATE public.dispatch_offers SET status = 'withdrawn' WHERE request_id = ? AND status = 'pending'", requestId);
                if (current.assignedProviderId() != null) {
                    jdbc.update("UPDATE public.provider_members SET is_available = FALSE WHERE user_id = ?", current.assignedProviderId());
                }
                audit.record(actor.id(), "request.cancelled_by_" + actor.role(), "rescue_request", requestId);
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

    public RequestDetails act(Actor actor, UUID requestId, StateActionRequest input) {
        if (input.expectedVersion() == null) throw stale();
        RequestRow current = requireParticipant(actor, requestId);
        String next;
        String nextWorkType = current.workType();
        if ("start_work".equals(input.action())) {
            if (!"provider".equals(actor.role()) || !"diagnosing".equals(current.status())
                    || current.serviceRequiresQuote() || input.workType() == null) {
                throw invalidAction();
            }
            nextWorkType = input.workType();
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
                jdbc.update("UPDATE public.provider_members SET is_available = FALSE WHERE user_id = ?", current.assignedProviderId());
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
            String workType = jdbc.query("""
                    SELECT quote.work_type
                    FROM public.quotes quote
                    JOIN public.rescue_requests rr ON rr.id = quote.request_id
                    WHERE quote.id = ? AND quote.request_id = ? AND quote.status = 'pending'
                      AND rr.customer_id = ? AND rr.status = 'awaiting_quote' AND rr.version = ?
                    FOR UPDATE OF quote, rr
                    """, rs -> rs.next() ? rs.getString(1) : null,
                    quoteId, requestId, actor.id(), input.expectedRequestVersion());
            if (workType == null) return 0;
            boolean approved = "approve".equals(input.decision());
            jdbc.update("UPDATE public.quotes SET status = ?, decided_at = NOW() WHERE id = ? AND status = 'pending'",
                    approved ? "approved" : "rejected", quoteId);
            String next = approved ? ("transport".equals(workType) ? "transporting" : "repairing") : "diagnosing";
            int updated = jdbc.update("""
                    UPDATE public.rescue_requests SET status = ?, work_type = ?
                    WHERE id = ? AND status = 'awaiting_quote' AND version = ?
                    """, next, approved ? workType : null, requestId, input.expectedRequestVersion());
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
                    ON CONFLICT (request_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
                    """, input.rating(), clean(input.comment()), requestId, actor.id());
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
            int deleted = jdbc.update(
                    "DELETE FROM public.reviews WHERE request_id = ? AND customer_id = ?",
                    requestId, actor.id());
            if (deleted > 0) {
                audit.record(actor.id(), "review.deleted", "rescue_request", requestId);
                quality.assessRequest(requestId);
            }
            return deleted;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND", "Không tìm thấy đánh giá của bạn.");
        }
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
        RoadRoutingService.RoadRoute route = routing.routeWithGeometry(
                        provider.latitude(), provider.longitude(), request.pickupLatitude(), request.pickupLongitude())
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ROUTING_UNAVAILABLE",
                        "Dịch vụ tuyến đường xe máy đang tạm thời không khả dụng."));
        return new RoadRouteResponse(route.distanceMeters(), route.durationSeconds(), route.coordinates().stream()
                .map(point -> new RouteCoordinate(point.latitude(), point.longitude()))
                .toList());
    }

    private RequestRow requireParticipant(Actor actor, UUID requestId) {
        RequestRow row = jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote,
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
                rs.getBoolean("requires_quote"), rs.getString("vehicle_power_type"), rs.getString("vehicle_description"),
                rs.getString("work_type"),
                rs.getString("pickup_area_label"), rs.getString("pickup_note"), rs.getDouble("pickup_latitude"),
                rs.getDouble("pickup_longitude"), rs.getObject("assigned_provider_id", UUID.class),
                rs.getString("provider_name"), rs.getString("provider_contact_phone"),
                rs.getString("provider_team_name"), rs.getString("rescue_vehicle_label"),
                getInteger(rs, "road_distance_m"), getInteger(rs, "eta_minutes"),
                rs.getString("routing_status"), rs.getString("location_precision"), rs.getInt("version"), rs.getTimestamp("requested_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }

    private void setActor(UUID actorId) {
        jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actorId.toString());
    }

    private boolean isTrackable(String status) {
        return List.of("assigned", "en_route", "awaiting_arrival_confirmation", "arrived", "diagnosing",
                "awaiting_quote", "repairing", "transporting", "awaiting_completion").contains(status);
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

    private static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

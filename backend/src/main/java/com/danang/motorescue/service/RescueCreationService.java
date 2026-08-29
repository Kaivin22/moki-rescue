package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.clean;
import static com.danang.motorescue.service.RescueJdbcSupport.distanceMeters;
import static com.danang.motorescue.service.RescueJdbcSupport.getDouble;
import static com.danang.motorescue.service.RescueJdbcSupport.sameCoordinate;

import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueCreationService {
    private record Created(UUID id, boolean inserted) {}
    private record ServicePolicy(boolean requiresDestination) {}
    private record LateCancellationSummary(int count, boolean cooldownActive) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final ServiceAreaService serviceArea;
    private final AuditService audit;
    private final RescuePolicyProperties policy;
    private final RescueRequestAccess access;

    public RescueCreationService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            ServiceAreaService serviceArea,
            AuditService audit,
            RescuePolicyProperties policy,
            RescueRequestAccess access) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.serviceArea = serviceArea;
        this.audit = audit;
        this.policy = policy;
        this.access = access;
    }

    public UUID create(Actor actor, UUID idempotencyKey, CreateRequest input) {
        access.requireCustomer(actor);
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
        if (created == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "CREATE_FAILED", "Không thể tạo yêu cầu.");
        }
        if (created.inserted()) dispatch.match(created.id());
        return created.id();
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

    private void validateDestinationInput(String label, Double latitude, Double longitude) {
        boolean any = clean(label) != null || latitude != null || longitude != null;
        boolean complete = clean(label) != null && latitude != null && longitude != null;
        if (any && !complete) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DESTINATION_INCOMPLETE",
                    "Điểm giao xe phải có đủ tên vị trí và tọa độ.");
        }
    }
}

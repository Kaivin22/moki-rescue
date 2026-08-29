package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.clean;
import static com.danang.motorescue.service.RescueJdbcSupport.distanceMeters;

import com.danang.motorescue.config.CaseLifecycleProperties;
import com.danang.motorescue.model.ApiModels.DestinationRequest;
import com.danang.motorescue.model.ApiModels.StateActionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueLifecycleService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final DispatchService dispatch;
    private final RequestStateMachine stateMachine;
    private final ServiceAreaService serviceArea;
    private final AuditService audit;
    private final CaseLifecycleProperties lifecyclePolicy;
    private final RescueRequestAccess access;
    private final RescueNotificationService notifications;

    public RescueLifecycleService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            DispatchService dispatch,
            RequestStateMachine stateMachine,
            ServiceAreaService serviceArea,
            AuditService audit,
            CaseLifecycleProperties lifecyclePolicy,
            RescueRequestAccess access,
            RescueNotificationService notifications) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.dispatch = dispatch;
        this.stateMachine = stateMachine;
        this.serviceArea = serviceArea;
        this.audit = audit;
        this.lifecyclePolicy = lifecyclePolicy;
        this.access = access;
        this.notifications = notifications;
    }

    public void retryDispatch(Actor actor, UUID requestId) {
        access.requireCustomer(actor);
        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
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
    }

    public void act(Actor actor, UUID requestId, StateActionRequest input) {
        if (input.expectedVersion() == null) throw access.stale();
        RescueRequestData current = access.requireParticipant(actor, requestId);
        boolean feedbackAction = List.of("reject_arrival", "reject_repair", "reject_transport")
                .contains(input.action());
        if (feedbackAction) validateFeedback(input.action(), input.reasonCode(), input.note());
        String next;
        String nextWorkType = current.workType();
        if ("start_work".equals(input.action())) {
            if (!"provider".equals(actor.role())) {
                throw access.invalidAction();
            }
            if ("quote_approved".equals(current.status())) {
                if (current.workType() == null
                        || (input.workType() != null && !input.workType().equals(current.workType()))) {
                    throw access.invalidAction();
                }
                nextWorkType = current.workType();
            } else if ("diagnosing".equals(current.status())
                    && !current.serviceRequiresQuote() && input.workType() != null) {
                nextWorkType = input.workType();
            } else {
                throw access.invalidAction();
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
                if (!requestedWorkType.equals(current.workType())) throw access.invalidAction();
            }
            next = stateMachine.next(actor.role(), current.status(), input.action());
        }

        String workTypeToPersist = nextWorkType;

        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
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
        if (changed == 0) throw access.stale();
        notifications.notifyCounterparty(actor, requestId, NotificationKind.STATUS_CHANGED, next);
    }

    public void updateDestination(Actor actor, UUID requestId, DestinationRequest input) {
        access.requireCustomer(actor);
        validateDestinationInput(input.areaLabel(), input.latitude(), input.longitude());
        if (!serviceArea.contains(input.latitude(), input.longitude())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_OUTSIDE_SERVICE_AREA",
                    "Điểm giao xe nằm ngoài vùng phục vụ đang vận hành.");
        }
        RescueRequestData current = access.requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id())
                || !List.of("arrived", "diagnosing", "awaiting_quote").contains(current.status())) {
            throw access.invalidAction();
        }
        if (distanceMeters(current.pickupLatitude(), current.pickupLongitude(), input.latitude(), input.longitude()) < 50) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DESTINATION_TOO_CLOSE",
                    "Điểm giao xe phải cách điểm đón ít nhất 50 mét.");
        }
        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
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
        if (changed == 0) throw access.stale();
        notifications.notifyCounterparty(actor, requestId, NotificationKind.STATUS_CHANGED, "destination_updated");
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
}

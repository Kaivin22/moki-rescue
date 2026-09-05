package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.clean;

import com.danang.motorescue.model.ApiModels.IncidentReportRequest;
import com.danang.motorescue.model.ApiModels.SupportRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueIncidentService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final PushNotificationService push;
    private final RescueRequestAccess access;

    public RescueIncidentService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            AuditService audit,
            PushNotificationService push,
            RescueRequestAccess access) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
        this.push = push;
        this.access = access;
    }

    public void requestSupport(Actor actor, UUID requestId, SupportRequest input) {
        access.requireCustomer(actor);
        RescueRequestData current = access.requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id())
                || List.of("completed", "cancelled").contains(current.status())) {
            throw access.invalidAction();
        }
        String note = clean(input.note());
        if ("other".equals(input.reasonCode()) && (note == null || note.length() < 5)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SUPPORT_REASON_REQUIRED",
                    "Hãy mô tả nội dung cần hỗ trợ bằng ít nhất 5 ký tự.");
        }
        String context = note == null ? input.reasonCode() : input.reasonCode() + ": " + note;
        int inserted = transactions.execute(status -> {
            access.setActor(actor.id());
            int changed = jdbc.update("""
                    INSERT INTO public.case_attention_flags(request_id, code, context_note)
                    VALUES (?, 'customer_support_requested', ?)
                    ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                    """, requestId, context);
            if (changed > 0) audit.record(actor.id(), "support.requested", "rescue_request", requestId);
            if (changed > 0) push.notifyStaff(NotificationKind.SUPPORT_REQUESTED, input.reasonCode(), requestId);
            return changed;
        });
    }

    public void reportIncident(Actor actor, UUID requestId, IncidentReportRequest input) {
        access.requireCustomer(actor);
        RescueRequestData current = access.requireParticipant(actor, requestId);
        if (!current.customerId().equals(actor.id()) || current.assignedProviderId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "INCIDENT_NOT_ALLOWED",
                    "Chỉ có thể báo sự cố sau khi một đội cứu hộ đã nhận ca.");
        }
        int inserted = transactions.execute(status -> {
            access.setActor(actor.id());
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
                push.notifyStaff(NotificationKind.SUPPORT_REQUESTED, "incident_report", requestId);
            }
            return changed;
        });
        if (inserted == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INCIDENT_ALREADY_REPORTED",
                    "Bạn đã gửi nội dung thuộc nhóm này cho ca hiện tại.");
        }
    }
}

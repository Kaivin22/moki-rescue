package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.QuoteDecisionRequest;
import com.danang.motorescue.model.ApiModels.QuoteRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RescueQuoteService {
    private record QuoteDecision(String workType, boolean hasDestination) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final RescueRequestAccess access;
    private final RescueNotificationService notifications;

    public RescueQuoteService(
            JdbcTemplate jdbc,
            TransactionTemplate transactions,
            AuditService audit,
            RescueRequestAccess access,
            RescueNotificationService notifications) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
        this.access = access;
        this.notifications = notifications;
    }

    public void submitQuote(Actor actor, UUID requestId, QuoteRequest input) {
        if (!"provider".equals(actor.role())) throw access.forbidden();
        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
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
        if (changed == 0) throw access.stale();
        notifications.notifyCounterparty(actor, requestId, NotificationKind.QUOTE_SUBMITTED, null);
    }

    public void decideQuote(Actor actor, UUID requestId, UUID quoteId, QuoteDecisionRequest input) {
        access.requireCustomer(actor);
        int changed = transactions.execute(status -> {
            access.setActor(actor.id());
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
        if (changed == 0) throw access.stale();
        notifications.notifyCounterparty(actor, requestId, NotificationKind.QUOTE_DECIDED, null);
    }
}

package com.danang.motorescue.service;

import static com.danang.motorescue.service.CommunicationSupport.*;
import com.danang.motorescue.model.ApiModels.IncidentResolutionRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.CommunicationModels.*;
import com.danang.motorescue.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class SupportTicketService {
    private static final String TICKET_SQL = """
            SELECT t.*, p.display_name AS owner_name FROM public.support_tickets t
            JOIN public.profiles p ON p.id = t.owner_id WHERE (t.owner_id = ? OR ?)
            """;
    private static final RowMapper<Ticket> TICKET = (rs, row) -> new Ticket(
            rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("owner_name"),
            rs.getObject("incident_id", UUID.class), rs.getString("subject"), rs.getString("description"),
            rs.getString("status"), rs.getLong("version"), rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant());
    private static final RowMapper<Message> MESSAGE = (rs, row) -> new Message(
            rs.getObject("id", UUID.class), rs.getObject("author_id", UUID.class), rs.getString("author_name"),
            rs.getString("author_role"), rs.getString("body"), rs.getBoolean("internal"), rs.getTimestamp("created_at").toInstant());
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    private final OperatorService operator;

    public SupportTicketService(JdbcTemplate jdbc, TransactionTemplate transactions, AuditService audit, OperatorService operator) {
        this.jdbc = jdbc; this.transactions = transactions; this.audit = audit; this.operator = operator;
    }

    public Page<Ticket> list(Actor actor, String status, Instant before, UUID beforeId, int limit) {
        if (!List.of("all", "open", "waiting_user", "resolved", "dismissed").contains(status))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Bộ lọc không hợp lệ.");
        return page(jdbc, TICKET_SQL + " AND (? = 'all' OR t.status = ?)",
                List.of(actor.id(), admin(actor), status, status), before, beforeId, limit, TICKET, Ticket::createdAt, Ticket::id);
    }

    public Ticket detail(Actor actor, UUID id) {
        var rows = jdbc.query(TICKET_SQL + " AND t.id = ?", TICKET, actor.id(), admin(actor), id);
        if (rows.isEmpty()) throw missing();
        return rows.get(0);
    }

    public Ticket forIncident(Actor actor, UUID incidentId) {
        var rows = jdbc.query(TICKET_SQL + " AND t.incident_id = ?", TICKET, actor.id(), admin(actor), incidentId);
        if (rows.isEmpty()) throw missing();
        return rows.get(0);
    }

    public Ticket create(Actor actor, CreateTicket input) {
        if (admin(actor)) throw new ApiException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Admin xử lý phiếu, không tự tạo phiếu cho người dùng.");
        String subject = clean(input.subject(), 5, 160), description = clean(input.description(), 10, 4000);
        return transactions.execute(tx -> {
            lockActor(jdbc, actor);
            var existing = jdbc.query(TICKET_SQL + " AND t.id = ?", TICKET, actor.id(), false, input.id());
            if (!existing.isEmpty()) {
                Ticket old = existing.get(0);
                if (!old.subject().equals(subject) || !old.description().equals(description)) throw conflict();
                return old;
            }
            Integer open = jdbc.queryForObject("SELECT COUNT(*) FROM public.support_tickets WHERE owner_id = ? AND status IN ('open', 'waiting_user')", Integer.class, actor.id());
            if (open != null && open >= 10) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "SUPPORT_LIMIT", "Bạn đang có 10 phiếu chưa đóng. Hãy trao đổi trong phiếu đang có.");
            jdbc.update("INSERT INTO public.support_tickets(id, owner_id, subject, description) VALUES (?, ?, ?, ?)", input.id(), actor.id(), subject, description);
            notifyAdmins(actor, input.id(), "support-new:" + input.id(), "Phiếu hỗ trợ mới");
            audit.record(actor.id(), "support.created", "support_ticket", input.id());
            return detail(actor, input.id());
        });
    }

    public Page<Message> messages(Actor actor, UUID id, Instant before, UUID beforeId, int limit) {
        detail(actor, id);
        return page(jdbc, """
                SELECT t.*, p.display_name AS author_name FROM public.support_messages t
                LEFT JOIN public.profiles p ON p.id = t.author_id
                WHERE t.ticket_id = ? AND (NOT t.internal OR ?)
                """, List.of(id, admin(actor)), before, beforeId, limit, MESSAGE, Message::createdAt, Message::id);
    }

    private Ticket locked(Actor actor, UUID id) {
        Ticket initial = detail(actor, id);
        // Same lock order as existing incident resolution: incident first, ticket second.
        if (initial.incidentId() != null)
            jdbc.queryForObject("SELECT id FROM public.incident_reports WHERE id = ? FOR UPDATE", UUID.class, initial.incidentId());
        var rows = jdbc.query(TICKET_SQL + " AND t.id = ? FOR UPDATE OF t", TICKET, actor.id(), admin(actor), id);
        if (rows.isEmpty()) throw missing();
        return rows.get(0);
    }

    public void reply(Actor actor, UUID id, SendMessage input) {
        String body = clean(input.body(), 1, 4000);
        if (input.internal()) requireAdmin(actor);
        transactions.executeWithoutResult(tx -> {
            lockActor(jdbc, actor);
            Ticket ticket = locked(actor, id);
            var duplicate = jdbc.query("""
                    SELECT t.*, NULL::TEXT AS author_name FROM public.support_messages t
                    WHERE t.id = ? AND t.ticket_id = ? AND t.author_id = ?
                    """, MESSAGE, input.id(), id, actor.id());
            if (!duplicate.isEmpty()) {
                if (!duplicate.get(0).body().equals(body) || duplicate.get(0).internal() != input.internal()) throw conflict();
                return;
            }
            if (List.of("resolved", "dismissed").contains(ticket.status()))
                throw new ApiException(HttpStatus.CONFLICT, "SUPPORT_CLOSED", "Phiếu đã đóng, không thể gửi thêm tin nhắn.");
            Integer recent = jdbc.queryForObject("SELECT COUNT(*) FROM public.support_messages WHERE author_id = ? AND created_at > NOW() - INTERVAL '1 minute'", Integer.class, actor.id());
            if (recent != null && recent >= 30) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "API_RATE_LIMITED", "Bạn gửi quá nhanh. Vui lòng chờ một chút.");
            jdbc.update("INSERT INTO public.support_messages(id, ticket_id, author_id, author_role, body, internal) VALUES (?, ?, ?, ?, ?, ?)",
                    input.id(), id, actor.id(), actor.role(), body, input.internal());
            String next = input.internal() ? ticket.status() : admin(actor) ? "waiting_user" : "open";
            jdbc.update("UPDATE public.support_tickets SET status = ?, updated_at = NOW(), version = version + 1 WHERE id = ?", next, id);
            if (!input.internal()) {
                if (admin(actor)) notifyOwner(ticket, "support-message:" + input.id(), "Hỗ trợ đã có phản hồi");
                else notifyAdmins(actor, id, "support-message:" + input.id(), "Người dùng phản hồi phiếu hỗ trợ");
            }
            audit.record(actor.id(), input.internal() ? "support.internal_note" : "support.replied", "support_ticket", id);
        });
    }

    public void changeStatus(Actor actor, UUID id, ChangeStatus input) {
        requireAdmin(actor);
        String note = clean(input.note(), 5, 500);
        if (!List.of("open", "waiting_user", "resolved", "dismissed").contains(input.status())) throw conflict();
        transactions.executeWithoutResult(tx -> {
            Ticket ticket = locked(actor, id);
            if (ticket.version() != input.version() || List.of("resolved", "dismissed").contains(ticket.status())) throw conflict();
            if (ticket.incidentId() != null && List.of("resolved", "dismissed").contains(input.status())) {
                operator.resolveIncident(actor, ticket.incidentId(), new IncidentResolutionRequest(input.status(), note));
                return; // The database trigger synchronizes the conversation, note and notification.
            }
            UUID messageId = UUID.randomUUID();
            jdbc.update("UPDATE public.support_tickets SET status = ?, updated_at = NOW(), version = version + 1 WHERE id = ?", input.status(), id);
            jdbc.update("INSERT INTO public.support_messages(id, ticket_id, author_id, author_role, body) VALUES (?, ?, ?, 'system', ?)", messageId, id, actor.id(), note);
            notifyOwner(ticket, "support-status:" + messageId, "Phiếu hỗ trợ đã cập nhật");
            audit.record(actor.id(), "support." + input.status(), "support_ticket", id);
        });
    }

    private void notifyOwner(Ticket ticket, String key, String title) {
        jdbc.update("""
                INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
                VALUES (?, 'support', ?, 'Mở phiếu để xem nội dung phản hồi.', 'support', ?, ?)
                ON CONFLICT (user_id, event_key) DO NOTHING
                """, ticket.ownerId(), title, ticket.id(), key);
    }
    private void notifyAdmins(Actor sender, UUID ticketId, String key, String title) {
        jdbc.update("""
                INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
                SELECT id, 'support', ?, 'Có nội dung hỗ trợ cần kiểm tra.', 'support', ?, ?
                FROM public.profiles WHERE role = 'admin' AND is_active AND id <> ?
                ON CONFLICT (user_id, event_key) DO NOTHING
                """, title, ticketId, key, sender.id());
    }
}

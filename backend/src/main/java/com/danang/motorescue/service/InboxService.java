package com.danang.motorescue.service;

import static com.danang.motorescue.service.CommunicationSupport.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.CommunicationModels.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class InboxService {
    private static final RowMapper<Notification> NOTIFICATION = (rs, row) -> new Notification(
            rs.getObject("id", UUID.class), rs.getString("kind"), rs.getString("title"), rs.getString("body"),
            rs.getString("target_type"), rs.getObject("target_id", UUID.class),
            rs.getTimestamp("read_at") == null ? null : rs.getTimestamp("read_at").toInstant(), rs.getTimestamp("created_at").toInstant());
    private static final RowMapper<Announcement> ANNOUNCEMENT = (rs, row) -> new Announcement(
            rs.getObject("id", UUID.class), rs.getString("audience"), rs.getString("title"), rs.getString("body"),
            rs.getInt("recipient_count"), rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("withdrawn_at") == null ? null : rs.getTimestamp("withdrawn_at").toInstant(), rs.getInt("version"));
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    public InboxService(JdbcTemplate jdbc, TransactionTemplate transactions, AuditService audit) {
        this.jdbc = jdbc; this.transactions = transactions; this.audit = audit;
    }
    public Page<Notification> list(Actor actor, boolean unread, Instant before, UUID beforeId, int limit) {
        return page(jdbc, "SELECT t.* FROM public.user_notifications t WHERE t.user_id = ? AND t.deleted_at IS NULL AND (NOT ? OR t.read_at IS NULL)",
                List.of(actor.id(), unread), before, beforeId, limit, NOTIFICATION, Notification::createdAt, Notification::id);
    }
    public Count unread(Actor actor) {
        return new Count(jdbc.queryForObject("SELECT COUNT(*) FROM public.user_notifications WHERE user_id = ? AND deleted_at IS NULL AND read_at IS NULL", Long.class, actor.id()));
    }
    public Notification detail(Actor actor, UUID id) {
        var rows = jdbc.query("SELECT * FROM public.user_notifications WHERE id = ? AND user_id = ? AND deleted_at IS NULL", NOTIFICATION, id, actor.id());
        if (rows.isEmpty()) throw missing();
        return rows.get(0);
    }
    public void read(Actor actor, UUID id) {
        if (jdbc.update("UPDATE public.user_notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ? AND deleted_at IS NULL", id, actor.id()) == 0) throw missing();
    }
    public void delete(Actor actor, UUID id) {
        // Keep event keys so retries do not recreate a deleted notification.
        int changed = jdbc.update("UPDATE public.user_notifications SET deleted_at=COALESCE(deleted_at,NOW()) WHERE user_id=? AND (?::uuid IS NULL OR id=?)",
                actor.id(), id, id);
        if (id != null && changed == 0) throw missing();
    }
    public void edit(Actor actor, UUID id, EditAnnouncement input) {
        requireAdmin(actor);
        String title=clean(input.title(),5,160), body=clean(input.body(),10,4000);
        transactions.executeWithoutResult(tx -> {
            lockActor(jdbc,actor);
            var old=jdbc.query("SELECT * FROM public.announcements WHERE id=? FOR UPDATE",ANNOUNCEMENT,id);
            if(old.isEmpty()) throw missing();
            var previous=old.get(0);
            if(previous.withdrawnAt()!=null || previous.version()!=input.version()) throw conflict();
            jdbc.update("""
                INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
                VALUES (?,'announcement.edited','announcement',?,jsonb_build_object('oldTitle',?::text,'oldBody',?::text,'version',?::int))
                """,actor.id(),id.toString(),previous.title(),previous.body(),previous.version());
            jdbc.update("UPDATE public.announcements SET title=?,body=?,version=version+1 WHERE id=?",title,body,id);
            jdbc.update("UPDATE public.user_notifications SET title=?,body=?,read_at=NULL WHERE target_type='announcement' AND target_id=? AND deleted_at IS NULL",title,body,id);
        });
    }
    public void withdraw(Actor actor, UUID id, int version) {
        requireAdmin(actor);
        transactions.executeWithoutResult(tx -> {
            lockActor(jdbc,actor);
            var old=jdbc.query("SELECT * FROM public.announcements WHERE id=? FOR UPDATE",ANNOUNCEMENT,id);
            if(old.isEmpty()) throw missing();
            if(old.get(0).withdrawnAt()!=null) return;
            if(old.get(0).version()!=version) throw conflict();
            jdbc.update("UPDATE public.announcements SET withdrawn_at=NOW(),version=version+1 WHERE id=?",id);
            jdbc.update("UPDATE public.user_notifications SET deleted_at=COALESCE(deleted_at,NOW()) WHERE target_type='announcement' AND target_id=?",id);
            audit.record(actor.id(),"announcement.withdrawn","announcement",id);
        });
    }
    public Page<Announcement> announcements(Actor actor, Instant before, UUID beforeId, int limit) {
        requireAdmin(actor);
        return page(jdbc, "SELECT t.* FROM public.announcements t WHERE TRUE", List.of(), before, beforeId, limit, ANNOUNCEMENT, Announcement::createdAt, Announcement::id);
    }
    public Announcement announcement(Actor actor, UUID id) {
        requireAdmin(actor);
        var rows = jdbc.query("SELECT * FROM public.announcements WHERE id = ?", ANNOUNCEMENT, id);
        if (rows.isEmpty()) throw missing();
        return rows.get(0);
    }
    public Count preview(Actor actor, String audience) {
        requireAdmin(actor); validateAudience(audience);
        return new Count(jdbc.queryForObject("SELECT COUNT(*) FROM public.profiles WHERE is_active AND (? = 'all' OR role = ?)", Long.class, audience, audience));
    }
    public Announcement publish(Actor actor, Publish input) {
        requireAdmin(actor); validateAudience(input.audience());
        String title = clean(input.title(), 5, 160), body = clean(input.body(), 10, 4000);
        return transactions.execute(tx -> {
            lockActor(jdbc, actor);
            var old = jdbc.query("SELECT * FROM public.announcements WHERE id = ? AND created_by = ?", ANNOUNCEMENT, input.id(), actor.id());
            if (!old.isEmpty()) {
                Announcement sent = old.get(0);
                if (!sent.audience().equals(input.audience()) || !sent.title().equals(title) || !sent.body().equals(body)) throw conflict();
                return sent;
            }
            jdbc.update("INSERT INTO public.announcements(id, created_by, audience, title, body) VALUES (?, ?, ?, ?, ?)", input.id(), actor.id(), input.audience(), title, body);
            int recipients = jdbc.update("""
                    INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
                    SELECT id, 'announcement', ?, ?, 'announcement', ?, ?
                    FROM public.profiles WHERE is_active AND (? = 'all' OR role = ?)
                    """, title, body, input.id(), "announcement:" + input.id(), input.audience(), input.audience());
            jdbc.update("UPDATE public.announcements SET recipient_count = ? WHERE id = ?", recipients, input.id());
            audit.record(actor.id(), "announcement.published", "announcement", input.id());
            return announcement(actor, input.id());
        });
    }
    private void validateAudience(String audience) {
        if (!List.of("all", "customer", "provider", "admin").contains(audience)) throw conflict();
    }
}

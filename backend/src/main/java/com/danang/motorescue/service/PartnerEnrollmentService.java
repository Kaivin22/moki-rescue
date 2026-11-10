package com.danang.motorescue.service;

import static com.danang.motorescue.service.PartnerEnrollmentModels.*;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PartnerEnrollmentService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final AuditService audit;
    private static final RowMapper<Application> APPLICATION = (rs, n) -> new Application(
            rs.getObject("id", UUID.class), rs.getObject("applicant_id", UUID.class), rs.getString("applicant_name"),
            rs.getString("name"), rs.getString("address"), rs.getString("contact_phone"),
            rs.getDouble("latitude"), rs.getDouble("longitude"),
            Arrays.asList((String[]) rs.getArray("service_codes").getArray()), rs.getString("status"),
            rs.getObject("team_id", UUID.class), rs.getString("review_note"), rs.getTimestamp("created_at").toInstant());
    private static final String APPLICATION_SELECT = """
            SELECT a.*, p.display_name AS applicant_name FROM public.shop_applications a
            JOIN public.profiles p ON p.id = a.applicant_id
            """;
    private static final String INVITATION_SELECT = """
            SELECT i.id, i.team_id, t.name AS team_name, p.display_name AS invitee_name,
              CASE WHEN i.status = 'pending' AND i.expires_at <= NOW() THEN 'expired' ELSE i.status END AS status,
              i.expires_at FROM public.team_invitations i JOIN public.rescue_teams t ON t.id = i.team_id
              JOIN public.profiles p ON p.id = i.invitee_id
            """;
    private static final RowMapper<Invitation> INVITATION = (rs, n) -> new Invitation(
            rs.getObject("id", UUID.class), rs.getObject("team_id", UUID.class), rs.getString("team_name"),
            rs.getString("invitee_name"), rs.getString("status"), rs.getTimestamp("expires_at").toInstant());

    public PartnerEnrollmentService(JdbcTemplate jdbc, TransactionTemplate tx, AuditService audit) {
        this.jdbc = jdbc; this.tx = tx; this.audit = audit;
    }
    public List<Application> applications(Actor actor) {
        return jdbc.query(APPLICATION_SELECT + " WHERE (? = 'admin' OR a.applicant_id = ?) ORDER BY a.created_at DESC LIMIT 200",
                APPLICATION, actor.role(), actor.id());
    }
    public List<Check> checks(Actor actor) {
        CommunicationSupport.requireAdmin(actor);
        return jdbc.query("""
                SELECT code, label_vi, description_vi FROM public.team_verification_requirements
                WHERE is_active AND is_required ORDER BY sort_order
                """, (rs, n) -> new Check(rs.getString(1), rs.getString(2), rs.getString(3)));
    }
    public UUID apply(Actor actor, Apply input) {
        return tx.execute(status -> {
            requireCustomer(actor.id());
            if (exists("SELECT EXISTS(SELECT 1 FROM public.shop_applications WHERE applicant_id = ? AND status IN ('pending','approved'))", actor.id())
                    || exists("SELECT EXISTS(SELECT 1 FROM public.team_representatives WHERE user_id = ?)", actor.id()))
                throw conflict("Bạn đã có hồ sơ đang chờ hoặc cửa hàng được duyệt.");
            String name = CommunicationSupport.clean(input.name(), 2, 120);
            String address = CommunicationSupport.clean(input.address(), 5, 300);
            validateShop(input.latitude(), input.longitude(), input.serviceCodes());
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO public.shop_applications(id, applicant_id, name, address, contact_phone, latitude, longitude, service_codes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, string_to_array(?, ','))
                    """, id, actor.id(), name, address, input.contactPhone(), input.latitude(), input.longitude(), String.join(",", input.serviceCodes()));
            jdbc.update("""
                    INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
                    SELECT id, 'shop_application', 'Hồ sơ cửa hàng mới', ?, 'shop_application', ?, ?
                    FROM public.profiles WHERE role = 'admin' AND is_active
                    """, "Cần xác minh cửa hàng và người đại diện: " + name, id, "shop.apply:" + id);
            audit.record(actor.id(), "shop.application.created", "shop_application", id);
            return id;
        });
    }
    public void review(Actor actor, UUID id, Review input) {
        CommunicationSupport.requireAdmin(actor);
        tx.executeWithoutResult(status -> {
            var rows = jdbc.query(APPLICATION_SELECT + " WHERE a.id = ? FOR UPDATE OF a", APPLICATION, id);
            if (rows.isEmpty()) throw missing();
            Application app = rows.getFirst();
            if (!"pending".equals(app.status())) throw conflict("Hồ sơ đã được xử lý. Hãy tải lại.");
            String note = CommunicationSupport.clean(input.note(), 5, 300);
            UUID teamId = null;
            if ("approved".equals(input.decision())) {
                requireCustomer(app.applicantId());
                if (exists("SELECT EXISTS(SELECT 1 FROM public.team_representatives WHERE user_id = ?)", app.applicantId()))
                    throw conflict("Tài khoản đã đại diện cửa hàng khác.");
                var required = checks(actor).stream().map(Check::code).toList();
                if (required.isEmpty() || !new HashSet<>(input.checkedCodes()).containsAll(required))
                    throw conflict("Phải xác minh từng mục, gồm quyền đại diện và danh sách nhân sự.");
                validateShop(app.latitude(), app.longitude(), app.serviceCodes());
                if (exists("SELECT EXISTS(SELECT 1 FROM public.rescue_teams WHERE lower(name) = lower(?))", app.name()))
                    throw conflict("Tên cửa hàng đã tồn tại. Đối chiếu hồ sơ để tránh tạo trùng.");
                teamId = UUID.randomUUID();
                jdbc.update("""
                        INSERT INTO public.rescue_teams(id, name, partner_reference, hotline, base_address,
                          base_latitude, base_longitude, status, verified_by, verified_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, NOW())
                        """, teamId, app.name(), ("APP-" + id).toUpperCase(java.util.Locale.ROOT), app.contactPhone(), app.address(), app.latitude(), app.longitude(), actor.id());
                jdbc.update("INSERT INTO public.team_representatives(team_id,user_id,approved_by) VALUES (?,?,?)", teamId, app.applicantId(), actor.id());
                for (String code : app.serviceCodes())
                    jdbc.update("INSERT INTO public.team_capabilities(team_id,service_code) VALUES (?,?)", teamId, code);
                for (String code : required)
                    jdbc.update("""
                            INSERT INTO public.team_verification_checks(team_id,requirement_code,completed,note,checked_by,checked_at)
                            VALUES (?, ?, TRUE, ?, ?, NOW())
                            """, teamId, code, note, actor.id());
                // No provider membership or working hours are invented for the representative.
            } else if (!"rejected".equals(input.decision())) throw conflict("Quyết định không hợp lệ.");
            jdbc.update("""
                    UPDATE public.shop_applications SET status = ?, team_id = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?
                    """, input.decision(), teamId, note, actor.id(), id);
            notify(app.applicantId(), "Kết quả hồ sơ cửa hàng", "approved".equals(input.decision())
                    ? "Cửa hàng đã được xác minh. Bạn có thể mời nhân sự. Cần cấu hình giờ hoạt động trước khi nhận ca."
                    : "Hồ sơ bị từ chối: " + note, "shop_application", id, "shop.review:" + id);
            audit.record(actor.id(), "shop.application." + input.decision(), "shop_application", id);
        });
    }
    public List<Shop> shops(Actor actor) {
        return jdbc.query("""
                SELECT t.id,t.name,t.base_address,t.status FROM public.rescue_teams t
                JOIN public.team_representatives r ON r.team_id = t.id WHERE r.user_id = ?
                """, (rs, n) -> new Shop(rs.getObject(1, UUID.class),rs.getString(2),rs.getString(3),rs.getString(4)), actor.id());
    }
    public List<Member> members(Actor actor, UUID teamId) {
        requireRepresentative(actor, teamId, false);
        return jdbc.query("""
                SELECT pm.user_id,pm.display_name,pm.status,EXISTS(SELECT 1 FROM public.team_representatives r
                  WHERE r.team_id = pm.team_id AND r.user_id = pm.user_id) AS representative
                FROM public.provider_members pm WHERE pm.team_id = ? ORDER BY pm.display_name
                """, (rs,n) -> new Member(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3),rs.getBoolean(4)), teamId);
    }
    public List<Invitation> sent(Actor actor, UUID teamId) {
        requireRepresentative(actor, teamId, false);
        return jdbc.query(INVITATION_SELECT + " WHERE i.team_id = ? ORDER BY i.created_at DESC LIMIT 100", INVITATION, teamId);
    }
    public List<Invitation> inbox(Actor actor) {
        return jdbc.query(INVITATION_SELECT + " WHERE i.invitee_id = ? ORDER BY i.created_at DESC LIMIT 100", INVITATION, actor.id());
    }
    public void invite(Actor actor, UUID teamId, Invite input) {
        tx.executeWithoutResult(status -> {
            requireRepresentative(actor, teamId, true);
            if (!input.rosterConfirmed()) throw conflict("Cần xác nhận người được mời là nhân sự đủ năng lực của cửa hàng.");
            if (count("SELECT COUNT(*) FROM public.team_invitations WHERE team_id = ? AND created_at > NOW() - INTERVAL '1 day'", teamId) >= 20)
                throw conflict("Đã đạt giới hạn 20 lời mời trong ngày.");
            // Exact phone only; never return a customer directory or account identity before sending.
            var targets = jdbc.query("SELECT user_id FROM public.api_lookup_account_by_phone(?)",
                    (rs,n) -> rs.getObject(1,UUID.class), input.phone());
            if (targets.size() != 1 || targets.getFirst().equals(actor.id()))
                throw conflict("Không thể mời số này. Người nhận cần có tài khoản khách hợp lệ, khác người đại diện.");
            UUID target = targets.getFirst();
            requireCustomer(target);
            if (exists("SELECT EXISTS(SELECT 1 FROM public.team_representatives WHERE user_id = ?)", target))
                throw conflict("Không thể mời người đang đại diện một cửa hàng.");
            jdbc.update("UPDATE public.team_invitations SET status = 'expired' WHERE team_id = ? AND status = 'pending' AND expires_at <= NOW()", teamId);
            if (exists("SELECT EXISTS(SELECT 1 FROM public.team_invitations WHERE team_id = ? AND invitee_id = ? AND status = 'pending')", teamId, target))
                throw conflict("Đã có lời mời còn hiệu lực cho tài khoản này.");
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO public.team_invitations(id,team_id,invited_by,invitee_id,contact_phone) VALUES (?,?,?,?,?)", id, teamId, actor.id(), target, input.phone());
            String name = jdbc.queryForObject("SELECT name FROM public.rescue_teams WHERE id = ?", String.class, teamId);
            notify(target, "Lời mời tham gia cửa hàng", name + " mời bạn làm cứu hộ viên. Bạn có quyền chấp nhận hoặc từ chối trong 7 ngày.", "team_invitation", id, "team.invite:" + id);
            audit.record(actor.id(), "team.invitation.sent", "team_invitation", id);
        });
    }
    public void answer(Actor actor, UUID id, String decision) {
        tx.executeWithoutResult(status -> {
            lockAccountWork(actor.id());
            var teamIds = jdbc.query("SELECT team_id FROM public.team_invitations WHERE id = ? AND invitee_id = ?", (rs,n)->rs.getObject(1,UUID.class), id, actor.id());
            if (teamIds.isEmpty()) throw missing();
            UUID teamId = teamIds.getFirst();
            // Same order as administration: team -> profile -> member -> invitation.
            String teamStatus = jdbc.queryForObject("SELECT status FROM public.rescue_teams WHERE id = ? FOR UPDATE", String.class, teamId);
            jdbc.queryForObject("SELECT id FROM public.profiles WHERE id = ? FOR UPDATE", UUID.class, actor.id());
            var pending = jdbc.query("""
                    SELECT contact_phone FROM public.team_invitations
                    WHERE id = ? AND invitee_id = ? AND status = 'pending' AND expires_at > NOW() FOR UPDATE
                    """, (rs,n)->rs.getString(1), id, actor.id());
            if (pending.isEmpty()) throw conflict("Lời mời đã hết hạn, bị thu hồi hoặc đã trả lời.");
            if ("accepted".equals(decision)) {
                if (!"verified".equals(teamStatus)) throw conflict("Cửa hàng chưa được xác minh hoặc đã bị đình chỉ.");
                requireCustomer(actor.id());
                if (exists("SELECT EXISTS(SELECT 1 FROM public.team_representatives WHERE user_id = ?)", actor.id())) throw conflict("Tài khoản đang đại diện cửa hàng.");
                requireNoWork(actor.id());
                jdbc.update("""
                        INSERT INTO public.provider_members(user_id,team_id,display_name,contact_phone_e164,status,is_available)
                        VALUES (?,?,?,?,'active',FALSE)
                        ON CONFLICT(user_id) DO UPDATE SET team_id=EXCLUDED.team_id,display_name=EXCLUDED.display_name,
                          contact_phone_e164=EXCLUDED.contact_phone_e164,status='active',is_available=FALSE,
                          available_since=NULL,availability_until=NULL,last_latitude=NULL,last_longitude=NULL,
                          location_accuracy_m=NULL,rescue_vehicle_label=NULL
                        """, actor.id(), teamId, actor.displayName(), pending.getFirst());
                jdbc.update("UPDATE public.profiles SET role='provider' WHERE id=?", actor.id());
                jdbc.update("UPDATE public.team_invitations SET status='revoked',answered_at=NOW() WHERE invitee_id=? AND id<>? AND status='pending'", actor.id(), id);
            } else if (!"declined".equals(decision)) throw conflict("Quyết định không hợp lệ.");
            jdbc.update("UPDATE public.team_invitations SET status=?,answered_at=NOW() WHERE id=?", decision, id);
            UUID representative = jdbc.queryForObject("SELECT user_id FROM public.team_representatives WHERE team_id=?", UUID.class, teamId);
            notify(representative, "Phản hồi lời mời", actor.displayName() + ("accepted".equals(decision) ? " đã tham gia cửa hàng." : " đã từ chối lời mời."), "shop", teamId, "team.answer:" + id);
            audit.record(actor.id(), "team.invitation." + decision, "team_invitation", id);
        });
    }
    public void revoke(Actor actor, UUID teamId, UUID id) {
        tx.executeWithoutResult(status -> {
            requireRepresentative(actor, teamId, true);
            var users = jdbc.query("UPDATE public.team_invitations SET status='revoked',answered_at=NOW() WHERE id=? AND team_id=? AND status='pending' RETURNING invitee_id",
                    (rs,n)->rs.getObject(1,UUID.class), id, teamId);
            if (users.isEmpty()) throw conflict("Lời mời không còn chờ phản hồi.");
            notify(users.getFirst(), "Lời mời đã thu hồi", "Cửa hàng đã thu hồi lời mời tham gia.", "team_invitation", id, "team.revoke:" + id);
            audit.record(actor.id(), "team.invitation.revoked", "team_invitation", id);
        });
    }
    public void remove(Actor actor, UUID teamId, UUID userId) {
        tx.executeWithoutResult(status -> {
            lockAccountWork(userId);
            requireRepresentative(actor, teamId, true);
            if (actor.id().equals(userId)) throw conflict("Không thể tự gỡ người đại diện. Hãy liên hệ admin để xử lý quyền đại diện.");
            if (jdbc.query("SELECT id FROM public.profiles WHERE id=? FOR UPDATE", (rs,n)->rs.getObject(1,UUID.class), userId).isEmpty()) throw missing();
            var members = jdbc.query("SELECT status FROM public.provider_members WHERE team_id=? AND user_id=? FOR UPDATE", (rs,n)->rs.getString(1), teamId,userId);
            if (members.isEmpty()) throw missing();
            // Suspension is controlled by admin. A representative cannot erase it through re-enrollment.
            if (!"active".equals(members.getFirst())) throw conflict("Chỉ gỡ thành viên đang hoạt động. Hồ sơ bị đình chỉ cần admin xử lý.");
            requireNoWork(userId);
            jdbc.update("""
                    UPDATE public.provider_members SET status='left',is_available=FALSE,available_since=NULL,
                      availability_until=NULL,last_latitude=NULL,last_longitude=NULL,location_accuracy_m=NULL WHERE user_id=?
                    """, userId);
            jdbc.update("UPDATE public.profiles SET role='customer' WHERE id=? AND role='provider'", userId);
            notify(userId, "Đã rời cửa hàng", "Người đại diện đã gỡ bạn khỏi cửa hàng. Tài khoản và lịch sử ca được giữ lại.", "shop", teamId, "team.remove:" + UUID.randomUUID());
            audit.record(actor.id(), "team.member.removed", "provider", userId);
        });
    }
    private void requireRepresentative(Actor actor, UUID teamId, boolean lock) {
        var rows = jdbc.query("""
                SELECT t.status FROM public.rescue_teams t JOIN public.team_representatives r ON r.team_id=t.id
                WHERE t.id=? AND r.user_id=?
                """ + (lock ? " FOR UPDATE OF t" : ""), (rs,n)->rs.getString(1), teamId,actor.id());
        if (rows.isEmpty()) throw new ApiException(HttpStatus.FORBIDDEN,"SHOP_REPRESENTATIVE_REQUIRED","Chỉ người đại diện của cửa hàng được thực hiện.");
        if (lock && !"verified".equals(rows.getFirst())) throw conflict("Cửa hàng chưa được xác minh hoặc đã đình chỉ.");
    }
    private void requireCustomer(UUID userId) {
        var roles = jdbc.query("SELECT role FROM public.profiles WHERE id=? AND is_active FOR UPDATE",(rs,n)->rs.getString(1), userId);
        if (roles.isEmpty() || !"customer".equals(roles.getFirst())
                || exists("SELECT EXISTS(SELECT 1 FROM public.provider_members WHERE user_id=? AND status <> 'left')", userId))
            throw conflict("Cần tài khoản khách đang hoạt động, chưa thuộc cửa hàng và không bị đình chỉ.");
    }
    private void requireNoWork(UUID userId) {
        if (exists("SELECT EXISTS(SELECT 1 FROM public.rescue_requests WHERE (assigned_provider_id=? OR customer_id=?) AND status NOT IN ('completed','cancelled'))", userId,userId)
                || exists("SELECT EXISTS(SELECT 1 FROM public.dispatch_offers WHERE provider_id=? AND status='pending' AND expires_at>NOW())", userId))
            throw conflict("Tài khoản còn ca đang xử lý hoặc lời mời nhận ca. Hoàn tất hoặc bàn giao trước.");
    }
    private void lockAccountWork(UUID userId) {
        // Serialize role changes with creation of a customer case and account deletion.
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", Object.class, userId.toString());
    }
    private void validateShop(double latitude, double longitude, List<String> services) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT public.api_is_in_service_area(?,?)", Boolean.class,latitude,longitude)))
            throw conflict("Cửa hàng phải nằm trong vùng phục vụ Đà Nẵng.");
        if (services.isEmpty() || new HashSet<>(services).size()!=services.size()
                || count("SELECT COUNT(*) FROM public.service_types WHERE is_active AND code = ANY(string_to_array(?,','))",String.join(",",services))!=services.size())
            throw conflict("Chọn ít nhất một dịch vụ hợp lệ, không trùng lặp.");
    }
    private void notify(UUID userId,String title,String body,String type,UUID target,String key) {
        jdbc.update("""
                INSERT INTO public.user_notifications(user_id,kind,title,body,target_type,target_id,event_key)
                VALUES (?,'partner',?,?,?,?,?) ON CONFLICT(user_id,event_key) DO NOTHING
                """,userId,title,body,type,target,key);
    }
    private boolean exists(String sql,Object... args) { return Boolean.TRUE.equals(jdbc.queryForObject(sql,Boolean.class,args)); }
    private long count(String sql,Object... args) { return jdbc.queryForObject(sql,Long.class,args); }
    private ApiException missing() { return new ApiException(HttpStatus.NOT_FOUND,"PARTNER_NOT_FOUND","Không tìm thấy hồ sơ thuộc quyền của bạn."); }
    private ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT,"PARTNER_CONFLICT",message); }
}

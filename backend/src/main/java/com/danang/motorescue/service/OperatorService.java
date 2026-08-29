package com.danang.motorescue.service;

import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.model.ApiModels.AccountLookupResponse;
import com.danang.motorescue.model.ApiModels.AddProviderRequest;
import com.danang.motorescue.model.ApiModels.AdminServiceTypeResponse;
import com.danang.motorescue.model.ApiModels.CreateTeamRequest;
import com.danang.motorescue.model.ApiModels.QualityAlertSummary;
import com.danang.motorescue.model.ApiModels.RatingSummary;
import com.danang.motorescue.model.ApiModels.StaffRoleRequest;
import com.danang.motorescue.model.ApiModels.TeamResponse;
import com.danang.motorescue.model.ApiModels.TeamVerificationCheckResponse;
import com.danang.motorescue.model.ApiModels.TeamVerificationResponse;
import com.danang.motorescue.model.ApiModels.UpdateServiceTypeRequest;
import com.danang.motorescue.model.ApiModels.UpdateTeamVerificationRequest;
import com.danang.motorescue.model.ApiModels.AttentionFlagResponse;
import com.danang.motorescue.model.ApiModels.AttentionResolutionRequest;
import com.danang.motorescue.model.ApiModels.IncidentResolutionRequest;
import com.danang.motorescue.model.ApiModels.ProviderMemberResponse;
import com.danang.motorescue.model.ApiModels.AuditLogResponse;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OperatorService {
    private record VerificationReadiness(
            String teamName,
            String status,
            String contractReference,
            String verifiedByName,
            java.time.Instant verifiedAt,
            int activeProviderCount,
            int capabilityCount,
            int completedRequiredCount,
            int requiredCount) {
        boolean ready() {
            return PartnerVerificationPolicy.isReady(
                    activeProviderCount, capabilityCount, completedRequiredCount, requiredCount);
        }
    }

    private static final Set<String> SERVICE_ICONS = Set.of(
            "construct-outline", "battery-dead-outline", "flash-outline",
            "water-outline", "build-outline", "trail-sign-outline");
    private final JdbcTemplate jdbc;
    private final DispatchService dispatch;
    private final AuditService audit;
    private final TransactionTemplate transactions;
    private final QualityProperties qualityPolicy;

    public OperatorService(
            JdbcTemplate jdbc,
            DispatchService dispatch,
            AuditService audit,
            TransactionTemplate transactions,
            QualityProperties qualityPolicy) {
        this.jdbc = jdbc;
        this.dispatch = dispatch;
        this.audit = audit;
        this.transactions = transactions;
        this.qualityPolicy = qualityPolicy;
    }

    public List<TeamResponse> teams(Actor actor) {
        requireStaff(actor);
        return jdbc.query("""
                SELECT team.id, team.name, team.status,
                       (SELECT COUNT(*) FROM public.provider_members pm
                        WHERE pm.team_id = team.id AND pm.status = 'active') AS active_providers,
                       ARRAY(
                         SELECT capability.service_code
                         FROM public.team_capabilities capability
                         WHERE capability.team_id = team.id AND capability.is_active
                         ORDER BY capability.service_code
                       ) AS capability_codes,
                       rating.average_rating, rating.rating_count,
                       (SELECT COUNT(*) FROM public.team_quality_alerts history
                        WHERE history.team_id = team.id AND history.warning_number IS NOT NULL) AS warning_count,
                       active_alert.id AS alert_id,
                       active_alert.severity AS alert_severity,
                       active_alert.status AS alert_status,
                       active_alert.average_rating AS alert_average_rating,
                       active_alert.rating_count AS alert_rating_count,
                       active_alert.warning_number,
                       active_alert.created_at AS alert_created_at
                FROM public.rescue_teams team
                LEFT JOIN LATERAL (
                  SELECT ROUND(AVG(review.rating)::NUMERIC, 2) AS average_rating,
                         COUNT(*)::INTEGER AS rating_count
                  FROM public.reviews review
                  WHERE review.team_id = team.id AND NOT review.is_hidden
                ) rating ON TRUE
                LEFT JOIN LATERAL (
                  SELECT alert.*
                  FROM public.team_quality_alerts alert
                  WHERE alert.team_id = team.id AND alert.status IN ('open', 'warned')
                  ORDER BY CASE alert.status WHEN 'open' THEN 0 ELSE 1 END, alert.created_at DESC
                  LIMIT 1
                ) active_alert ON TRUE
                ORDER BY team.name
                """, (rs, rowNum) -> {
            var ratingAverage = rs.getBigDecimal("average_rating");
            int warningCount = rs.getInt("warning_count");
            UUID alertId = rs.getObject("alert_id", UUID.class);
            QualityAlertSummary alert = alertId == null ? null : new QualityAlertSummary(
                    alertId,
                    rs.getString("alert_severity"),
                    rs.getString("alert_status"),
                    rs.getBigDecimal("alert_average_rating").doubleValue(),
                    rs.getInt("alert_rating_count"),
                    rs.getObject("warning_number", Integer.class),
                    rs.getTimestamp("alert_created_at").toInstant());
            return new TeamResponse(
                    rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("status"),
                    rs.getInt("active_providers"),
                    Arrays.asList((String[]) rs.getArray("capability_codes").getArray()),
                    new RatingSummary(
                            ratingAverage == null ? null : ratingAverage.doubleValue(),
                            rs.getInt("rating_count")),
                    warningCount,
                    qualityPolicy.recommendsSuspensionReview(warningCount),
                    alert);
        });
    }

    public AccountLookupResponse lookupAccount(Actor actor, String phone) {
        requireAdmin(actor);
        AccountLookupResponse account = jdbc.query("""
                SELECT user_id, display_name, role
                FROM public.api_lookup_account_by_phone(?)
                """, rs -> rs.next() ? new AccountLookupResponse(
                rs.getObject("user_id", UUID.class), rs.getString("display_name"), rs.getString("role")) : null,
                phone);
        if (account == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND",
                    "Không tìm thấy tài khoản đang hoạt động với số đăng nhập này.");
        }
        audit.record(actor.id(), "account.lookup", "profile", account.id());
        return account;
    }

    public void retry(Actor actor, UUID requestId) {
        requireStaff(actor);
        transactions.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actor.id().toString());
            dispatch.retry(requestId);
            audit.record(actor.id(), "dispatch.retry", "rescue_request", requestId);
        });
        dispatch.match(requestId);
    }

    public void reassign(Actor actor, UUID requestId) {
        requireStaff(actor);
        transactions.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actor.id().toString());
            dispatch.reassign(requestId);
            audit.record(actor.id(), "dispatch.reassign", "rescue_request", requestId);
        });
        dispatch.match(requestId);
    }

    public List<AttentionFlagResponse> attentionFlags(Actor actor, boolean openOnly) {
        requireStaff(actor);
        return jdbc.query("""
                SELECT flag.id, flag.request_id,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       rr.status AS request_status, flag.code, flag.context_note, flag.status,
                       flag.detected_at, flag.resolution_note, flag.resolved_at
                FROM public.case_attention_flags flag
                JOIN public.rescue_requests rr ON rr.id = flag.request_id
                JOIN public.service_types service ON service.code = rr.service_code
                WHERE (NOT ? OR flag.status = 'open')
                ORDER BY CASE WHEN flag.status = 'open' THEN 0 ELSE 1 END, flag.detected_at DESC
                LIMIT 200
                """, (rs, rowNum) -> new AttentionFlagResponse(
                rs.getObject("id", UUID.class), rs.getObject("request_id", UUID.class),
                rs.getString("service_label"), rs.getString("request_status"), rs.getString("code"),
                rs.getString("context_note"), rs.getString("status"),
                rs.getTimestamp("detected_at").toInstant(), rs.getString("resolution_note"),
                rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant()),
                actor.locale(), openOnly);
    }

    public void resolveAttention(Actor actor, UUID flagId, AttentionResolutionRequest input) {
        requireStaff(actor);
        int changed = transactions.execute(status -> {
            int updated = jdbc.update("""
                    UPDATE public.case_attention_flags
                    SET status = 'resolved', resolution_note = ?, resolved_at = NOW(), resolved_by = ?
                    WHERE id = ? AND status = 'open'
                    """, input.note().trim(), actor.id(), flagId);
            if (updated > 0) audit.record(actor.id(), "attention.resolved", "case_attention_flag", flagId);
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "ATTENTION_ALREADY_RESOLVED",
                    "Cảnh báo đã được xử lý hoặc không còn tồn tại.");
        }
    }

    public void resolveIncident(Actor actor, UUID incidentId, IncidentResolutionRequest input) {
        requireStaff(actor);
        int changed = transactions.execute(status -> {
            UUID requestId = jdbc.query("""
                    SELECT request_id FROM public.incident_reports
                    WHERE id = ? AND status = 'open' FOR UPDATE
                    """, rs -> rs.next() ? rs.getObject("request_id", UUID.class) : null, incidentId);
            if (requestId == null) return 0;
            int updated = jdbc.update("""
                    UPDATE public.incident_reports
                    SET status = ?, resolution_note = ?, resolved_at = NOW(), resolved_by = ?
                    WHERE id = ? AND status = 'open'
                    """, input.decision(), input.note().trim(), actor.id(), incidentId);
            Boolean hasOpen = jdbc.queryForObject("""
                    SELECT EXISTS(
                      SELECT 1 FROM public.incident_reports
                      WHERE request_id = ? AND status = 'open'
                    )
                    """, Boolean.class, requestId);
            if (updated > 0 && !Boolean.TRUE.equals(hasOpen)) {
                jdbc.update("""
                        UPDATE public.case_attention_flags
                        SET status = 'resolved', resolution_note = ?, resolved_at = NOW(), resolved_by = ?
                        WHERE request_id = ? AND code = 'customer_incident_reported' AND status = 'open'
                        """, input.note().trim(), actor.id(), requestId);
            }
            if (updated > 0) audit.record(actor.id(), "incident." + input.decision(), "incident_report", incidentId);
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INCIDENT_ALREADY_RESOLVED",
                    "Khiếu nại không tồn tại hoặc đã được xử lý.");
        }
    }

    public List<AuditLogResponse> auditLogs(
            Actor actor,
            java.time.Instant before,
            Long beforeId,
            int requestedLimit) {
        requireAdmin(actor);
        if ((before == null) != (beforeId == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR",
                    "Cursor audit phải có đủ thời gian và mã bản ghi.");
        }
        int limit = Math.max(1, Math.min(requestedLimit, 100));
        if (before == null) {
            return jdbc.query("""
                    SELECT log.id, profile.display_name, log.action, log.entity_type,
                           log.entity_id, log.created_at
                    FROM public.audit_logs log
                    LEFT JOIN public.profiles profile ON profile.id = log.actor_id
                    ORDER BY log.created_at DESC, log.id DESC
                    LIMIT ?
                    """, (rs, rowNum) -> new AuditLogResponse(
                    rs.getLong("id"), rs.getString("display_name"), rs.getString("action"),
                    rs.getString("entity_type"), rs.getString("entity_id"),
                    rs.getTimestamp("created_at").toInstant()), limit);
        }
        return jdbc.query("""
                SELECT log.id, profile.display_name, log.action, log.entity_type,
                       log.entity_id, log.created_at
                FROM public.audit_logs log
                LEFT JOIN public.profiles profile ON profile.id = log.actor_id
                WHERE (log.created_at, log.id) < (?, ?)
                ORDER BY log.created_at DESC, log.id DESC
                LIMIT ?
                """, (rs, rowNum) -> new AuditLogResponse(
                rs.getLong("id"), rs.getString("display_name"), rs.getString("action"),
                rs.getString("entity_type"), rs.getString("entity_id"),
                rs.getTimestamp("created_at").toInstant()), java.sql.Timestamp.from(before), beforeId, limit);
    }

    public UUID createTeam(Actor actor, CreateTeamRequest input) {
        requireAdmin(actor);
        if ((input.baseLatitude() == null) != (input.baseLongitude() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TEAM_LOCATION", "Kinh độ và vĩ độ phải được cung cấp cùng nhau.");
        }
        UUID id = transactions.execute(status -> {
            UUID created = jdbc.queryForObject("""
                    INSERT INTO public.rescue_teams(
                      name, contract_reference, hotline, base_latitude, base_longitude, service_radius_km
                    ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
                    """, UUID.class, input.name().trim(), PartnerVerificationPolicy.normalizeReference(input.contractReference()),
                    input.hotline(), input.baseLatitude(), input.baseLongitude(), input.serviceRadiusKm());
            audit.record(actor.id(), "team.created", "rescue_team", created);
            return created;
        });
        if (id == null) throw new IllegalStateException("Team transaction returned no id");
        return id;
    }

    public TeamVerificationResponse teamVerification(Actor actor, UUID teamId) {
        requireAdmin(actor);
        VerificationReadiness readiness = verificationReadiness(teamId);
        List<TeamVerificationCheckResponse> checks = jdbc.query("""
                SELECT requirement.code,
                       requirement.label_vi, requirement.description_vi,
                       requirement.label_en, requirement.description_en,
                       requirement.is_required,
                       COALESCE(check_result.completed, FALSE) AS completed,
                       check_result.note,
                       checker.display_name AS checked_by_name,
                       check_result.checked_at
                FROM public.team_verification_requirements requirement
                LEFT JOIN public.team_verification_checks check_result
                  ON check_result.requirement_code = requirement.code
                 AND check_result.team_id = ?
                LEFT JOIN public.profiles checker ON checker.id = check_result.checked_by
                WHERE requirement.is_active
                ORDER BY requirement.sort_order, requirement.code
                """, (rs, rowNum) -> {
            var checkedAt = rs.getTimestamp("checked_at");
            return new TeamVerificationCheckResponse(
                    rs.getString("code"),
                    rs.getString("label_vi"),
                    rs.getString("description_vi"),
                    rs.getString("label_en"),
                    rs.getString("description_en"),
                    rs.getBoolean("is_required"),
                    rs.getBoolean("completed"),
                    rs.getString("note"),
                    rs.getString("checked_by_name"),
                    checkedAt == null ? null : checkedAt.toInstant());
        }, teamId);
        return new TeamVerificationResponse(
                teamId,
                readiness.teamName(),
                readiness.status(),
                readiness.contractReference(),
                readiness.verifiedByName(),
                readiness.verifiedAt(),
                readiness.activeProviderCount(),
                readiness.capabilityCount(),
                readiness.completedRequiredCount(),
                readiness.requiredCount(),
                readiness.ready(),
                checks);
    }

    public void updateTeamVerification(Actor actor, UUID teamId, UpdateTeamVerificationRequest input) {
        requireAdmin(actor);
        String contractReference = PartnerVerificationPolicy.normalizeReference(input.contractReference());
        Set<String> submittedCodes = new HashSet<>();
        input.checks().forEach(check -> {
            if (!submittedCodes.add(check.code())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DUPLICATE_VERIFICATION_CHECK",
                        "Danh sách xác minh có mục bị lặp.");
            }
        });

        transactions.executeWithoutResult(status -> {
            String currentStatus = jdbc.query("""
                            SELECT status FROM public.rescue_teams WHERE id = ? FOR UPDATE
                            """, (rs, rowNum) -> rs.getString("status"), teamId)
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new ApiException(
                            HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy đội cứu hộ."));
            Boolean referenceUsed = jdbc.queryForObject("""
                    SELECT EXISTS(
                      SELECT 1 FROM public.rescue_teams
                      WHERE contract_reference = ? AND id <> ?
                    )
                    """, Boolean.class, contractReference, teamId);
            if (Boolean.TRUE.equals(referenceUsed)) {
                throw new ApiException(HttpStatus.CONFLICT, "CONTRACT_REFERENCE_EXISTS",
                        "Mã hồ sơ đối tác đã được dùng cho một đội khác.");
            }

            Set<String> activeCodes = new HashSet<>(jdbc.queryForList("""
                    SELECT code FROM public.team_verification_requirements WHERE is_active
                    """, String.class));
            if (!activeCodes.equals(submittedCodes)) {
                throw new ApiException(HttpStatus.CONFLICT, "VERIFICATION_CHECKLIST_CHANGED",
                        "Checklist xác minh vừa thay đổi. Hãy tải lại và kiểm tra trước khi lưu.");
            }

            jdbc.update("UPDATE public.rescue_teams SET contract_reference = ? WHERE id = ?",
                    contractReference, teamId);
            input.checks().forEach(check -> {
                boolean completed = check.completed();
                jdbc.update("""
                        INSERT INTO public.team_verification_checks(
                          team_id, requirement_code, completed, note, checked_by, checked_at
                        ) VALUES (?, ?, ?, ?, CASE WHEN ? THEN ? ELSE NULL END,
                                  CASE WHEN ? THEN NOW() ELSE NULL END)
                        ON CONFLICT (team_id, requirement_code) DO UPDATE SET
                          completed = EXCLUDED.completed,
                          note = EXCLUDED.note,
                          checked_by = EXCLUDED.checked_by,
                          checked_at = EXCLUDED.checked_at
                        """, teamId, check.code(), completed, clean(check.note()),
                        completed, actor.id(), completed);
            });
            if ("verified".equals(currentStatus) && !verificationReadiness(teamId).ready()) {
                throw new ApiException(HttpStatus.CONFLICT, "VERIFIED_TEAM_REQUIREMENTS_REQUIRED",
                        "Không thể bỏ một điều kiện bắt buộc khi đội đang được xác minh.");
            }
            audit.record(actor.id(), "team.verification.updated", "rescue_team", teamId);
        });
    }

    public void setTeamStatus(Actor actor, UUID teamId, String nextStatus) {
        requireAdmin(actor);
        int changed = transactions.execute(status -> {
            jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actor.id().toString());
            List<String> lockedStatuses = jdbc.query(
                    "SELECT status FROM public.rescue_teams WHERE id = ? FOR UPDATE",
                    (rs, rowNum) -> rs.getString("status"), teamId);
            if (lockedStatuses.isEmpty()) return 0;
            if ("verified".equals(nextStatus)) {
                if (!verificationReadiness(teamId).ready()) {
                    throw new ApiException(HttpStatus.CONFLICT, "TEAM_VERIFICATION_INCOMPLETE",
                            "Hãy hoàn tất checklist, năng lực và ít nhất 1 cứu hộ viên trước khi xác minh đội.");
                }
            }
            int updated;
            if ("verified".equals(nextStatus)) {
                updated = jdbc.update("""
                        UPDATE public.rescue_teams
                        SET status = 'verified', verified_by = ?, verified_at = NOW()
                        WHERE id = ?
                        """, actor.id(), teamId);
            } else if ("pending".equals(nextStatus)) {
                updated = jdbc.update("""
                        UPDATE public.rescue_teams
                        SET status = 'pending', verified_by = NULL, verified_at = NULL
                        WHERE id = ?
                        """, teamId);
            } else {
                updated = jdbc.update("UPDATE public.rescue_teams SET status = 'suspended' WHERE id = ?", teamId);
            }
            if (updated > 0 && !"verified".equals(nextStatus)) {
                jdbc.update("""
                        UPDATE public.provider_members
                        SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                            location_accuracy_m = NULL
                        WHERE team_id = ?
                        """, teamId);
                List<UUID> affected = jdbc.query("""
                        UPDATE public.rescue_requests
                        SET status = 'needs_dispatch', assigned_team_id = NULL, assigned_provider_id = NULL,
                            routing_status = 'pending'
                        WHERE assigned_team_id = ? AND status NOT IN ('completed', 'cancelled')
                        RETURNING id
                        """, (rs, rowNum) -> rs.getObject("id", UUID.class), teamId);
                for (UUID requestId : affected) {
                    jdbc.update("""
                            INSERT INTO public.case_attention_flags(request_id, code, context_note)
                            VALUES (?, 'provider_withdrew', ?)
                            ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                            """, requestId, "Admin changed team status to " + nextStatus);
                    jdbc.update("""
                            UPDATE public.dispatch_offers SET status = 'withdrawn'
                            WHERE request_id = ? AND status = 'pending'
                            """, requestId);
                }
            }
            if (updated > 0) audit.record(actor.id(), "team.status." + nextStatus, "rescue_team", teamId);
            return updated;
        });
        if (changed == 0) throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy đội cứu hộ.");
    }

    public void setTeamCapabilities(Actor actor, UUID teamId, List<String> capabilityCodes) {
        requireAdmin(actor);
        List<String> uniqueCodes = capabilityCodes.stream().distinct().toList();
        transactions.executeWithoutResult(status -> {
            Boolean teamExists = jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM public.rescue_teams WHERE id = ?)", Boolean.class, teamId);
            if (!Boolean.TRUE.equals(teamExists)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy đội cứu hộ.");
            }
            Integer capabilityCount = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM public.service_types
                    WHERE is_active AND code = ANY (string_to_array(?, ','))
                    """, Integer.class, String.join(",", uniqueCodes));
            if (capabilityCount == null || capabilityCount != uniqueCodes.size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CAPABILITIES",
                        "Danh sách năng lực có loại dịch vụ không hợp lệ.");
            }
            jdbc.update("UPDATE public.team_capabilities SET is_active = FALSE WHERE team_id = ?", teamId);
            for (String code : uniqueCodes) {
                jdbc.update("""
                        INSERT INTO public.team_capabilities(team_id, service_code)
                        VALUES (?, ?) ON CONFLICT (team_id, service_code) DO UPDATE SET is_active = TRUE
                        """, teamId, code);
            }
            audit.record(actor.id(), "team.capabilities.updated", "rescue_team", teamId);
        });
    }

    public void addProvider(Actor actor, UUID teamId, AddProviderRequest input) {
        requireAdmin(actor);
        transactions.executeWithoutResult(status -> {
            String currentRole = lockActiveRole(input.userId());
            if ("admin".equals(currentRole) || "dispatcher".equals(currentRole)) {
                throw new ApiException(HttpStatus.CONFLICT, "ROLE_ASSIGNMENT_CONFLICT",
                        "Không thể chuyển trực tiếp tài khoản vận hành thành cứu hộ viên.");
            }
            if ("provider".equals(currentRole)) {
                Boolean hasActiveWork = jdbc.queryForObject("""
                        SELECT EXISTS(
                          SELECT 1 FROM public.rescue_requests
                          WHERE assigned_provider_id = ?
                            AND status NOT IN ('completed', 'cancelled')
                        )
                        """, Boolean.class, input.userId());
                if (Boolean.TRUE.equals(hasActiveWork)) {
                    throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_REQUEST_EXISTS",
                            "Không thể thay đổi thông tin đội khi cứu hộ viên đang xử lý ca.");
                }
            }
            Boolean teamExists = jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM public.rescue_teams WHERE id = ? AND status <> 'suspended')",
                    Boolean.class, teamId);
            if (!Boolean.TRUE.equals(teamExists)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Đội cứu hộ không tồn tại hoặc đang bị đình chỉ.");
            }
            jdbc.update("UPDATE public.profiles SET role = 'provider' WHERE id = ?", input.userId());
            jdbc.update("""
                    INSERT INTO public.provider_members(
                      user_id, team_id, display_name, contact_phone_e164, rescue_vehicle_label
                    ) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (user_id) DO UPDATE SET
                      team_id = EXCLUDED.team_id,
                      display_name = EXCLUDED.display_name,
                      contact_phone_e164 = EXCLUDED.contact_phone_e164,
                      rescue_vehicle_label = EXCLUDED.rescue_vehicle_label,
                      status = 'active',
                      is_available = FALSE
                    """, input.userId(), teamId, input.displayName().trim(), input.contactPhone(),
                    clean(input.rescueVehicleLabel()));
            audit.record(actor.id(), "provider.assigned", "provider", input.userId());
        });
    }

    public List<ProviderMemberResponse> providers(Actor actor, UUID teamId) {
        requireAdmin(actor);
        return jdbc.query("""
                SELECT user_id, display_name, contact_phone_e164, status, is_available,
                       rescue_vehicle_label, location_updated_at
                FROM public.provider_members
                WHERE team_id = ?
                ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'suspended' THEN 1 ELSE 2 END,
                         display_name, user_id
                """, (rs, rowNum) -> new ProviderMemberResponse(
                rs.getObject("user_id", UUID.class), rs.getString("display_name"),
                rs.getString("contact_phone_e164"), rs.getString("status"),
                rs.getBoolean("is_available"), rs.getString("rescue_vehicle_label"),
                rs.getTimestamp("location_updated_at") == null
                        ? null : rs.getTimestamp("location_updated_at").toInstant()), teamId);
    }

    public void setProviderStatus(Actor actor, UUID teamId, UUID providerId, String nextStatus) {
        requireAdmin(actor);
        int changed = transactions.execute(status -> {
            jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actor.id().toString());
            List<String> current = jdbc.query("""
                    SELECT status FROM public.provider_members
                    WHERE user_id = ? AND team_id = ? FOR UPDATE
                    """, (rs, rowNum) -> rs.getString("status"), providerId, teamId);
            if (current.isEmpty()) return 0;
            int updated = jdbc.update("""
                    UPDATE public.provider_members
                    SET status = ?, is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                        location_accuracy_m = NULL
                    WHERE user_id = ? AND team_id = ?
                    """, nextStatus, providerId, teamId);
            if (updated > 0 && !"active".equals(nextStatus)) {
                List<UUID> affected = jdbc.query("""
                        UPDATE public.rescue_requests
                        SET status = 'needs_dispatch', assigned_team_id = NULL, assigned_provider_id = NULL,
                            routing_status = 'pending'
                        WHERE assigned_provider_id = ? AND status NOT IN ('completed', 'cancelled')
                        RETURNING id
                        """, (rs, rowNum) -> rs.getObject("id", UUID.class), providerId);
                for (UUID requestId : affected) {
                    jdbc.update("""
                            INSERT INTO public.case_attention_flags(request_id, code, context_note)
                            VALUES (?, 'provider_withdrew', ?)
                            ON CONFLICT (request_id, code) WHERE status = 'open' DO NOTHING
                            """, requestId, "Admin changed provider status to " + nextStatus);
                    jdbc.update("""
                            UPDATE public.dispatch_offers SET status = 'withdrawn'
                            WHERE request_id = ? AND status = 'pending'
                            """, requestId);
                }
            }
            if (updated > 0) audit.record(actor.id(), "provider.status." + nextStatus, "provider", providerId);
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PROVIDER_NOT_FOUND",
                    "Không tìm thấy cứu hộ viên trong đội đã chọn.");
        }
    }

    public void setStaffRole(Actor actor, StaffRoleRequest input) {
        requireAdmin(actor);
        if (actor.id().equals(input.userId()) && !"admin".equals(input.role())) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_DEMOTE_SELF", "Admin không thể tự hạ quyền tài khoản đang dùng.");
        }
        int changed = transactions.execute(status -> {
            String currentRole = lockActiveRole(input.userId());
            if ("provider".equals(currentRole)) {
                throw new ApiException(HttpStatus.CONFLICT, "ROLE_ASSIGNMENT_CONFLICT",
                        "Hãy kết thúc vai trò cứu hộ viên trước khi cấp quyền vận hành.");
            }
            if (currentRole.equals(input.role())) return 1;
            if ("admin".equals(currentRole)) {
                Integer adminCount = jdbc.queryForObject("""
                        SELECT COUNT(*) FROM public.profiles
                        WHERE role = 'admin' AND is_active
                        """, Integer.class);
                if (adminCount == null || adminCount <= 1) {
                    throw new ApiException(HttpStatus.CONFLICT, "CANNOT_DEMOTE_LAST_ADMIN",
                            "Phải có ít nhất một admin khác trước khi hạ quyền admin này.");
                }
            }
            int updated = jdbc.update("UPDATE public.profiles SET role = ? WHERE id = ?", input.role(), input.userId());
            audit.record(actor.id(), "profile.role." + input.role(), "profile", input.userId());
            return updated;
        });
        if (changed == 0) throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản đang hoạt động.");
    }

    public List<AdminServiceTypeResponse> serviceTypes(Actor actor) {
        requireAdmin(actor);
        return jdbc.query("""
                SELECT code, label_vi, description_vi, label_en, description_en,
                       icon_name, requires_quote, requires_destination, sort_order, is_active
                FROM public.service_types
                ORDER BY sort_order, code
                """, (rs, rowNum) -> new AdminServiceTypeResponse(
                rs.getString("code"), rs.getString("label_vi"), rs.getString("description_vi"),
                rs.getString("label_en"), rs.getString("description_en"), rs.getString("icon_name"),
                rs.getBoolean("requires_quote"), rs.getBoolean("requires_destination"),
                rs.getShort("sort_order"), rs.getBoolean("is_active")));
    }

    public void updateServiceType(Actor actor, String code, UpdateServiceTypeRequest input) {
        requireAdmin(actor);
        if (code == null || !code.matches("^[a-z][a-z0-9_]{2,39}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SERVICE_CODE", "Mã dịch vụ không hợp lệ.");
        }
        if (!SERVICE_ICONS.contains(input.iconName())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SERVICE_ICON", "Icon dịch vụ không được hỗ trợ.");
        }
        int changed = transactions.execute(status -> {
            int updated = jdbc.update("""
                    UPDATE public.service_types
                    SET label_vi = ?, description_vi = ?, label_en = ?, description_en = ?,
                        icon_name = ?, requires_quote = ?, requires_destination = ?, sort_order = ?, is_active = ?
                    WHERE code = ?
                    """, input.labelVi().trim(), input.descriptionVi().trim(), input.labelEn().trim(),
                    input.descriptionEn().trim(), input.iconName(), input.requiresQuote(),
                    input.requiresDestination(), input.sortOrder(), input.active(), code);
            if (updated > 0) audit.record(actor.id(), "service_type.updated", "service_type", code);
            return updated;
        });
        if (changed == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "SERVICE_NOT_FOUND", "Không tìm thấy loại dịch vụ.");
        }
    }

    private VerificationReadiness verificationReadiness(UUID teamId) {
        return jdbc.query("""
                        SELECT team.name, team.status, team.contract_reference,
                               verifier.display_name AS verified_by_name, team.verified_at,
                               (SELECT COUNT(*) FROM public.provider_members member
                                WHERE member.team_id = team.id AND member.status = 'active') AS active_provider_count,
                               (SELECT COUNT(*) FROM public.team_capabilities capability
                                WHERE capability.team_id = team.id AND capability.is_active) AS capability_count,
                               (SELECT COUNT(*)
                                FROM public.team_verification_requirements requirement
                                WHERE requirement.is_active AND requirement.is_required) AS required_count,
                               (SELECT COUNT(*)
                                FROM public.team_verification_checks check_result
                                JOIN public.team_verification_requirements requirement
                                  ON requirement.code = check_result.requirement_code
                                WHERE check_result.team_id = team.id
                                  AND check_result.completed
                                  AND requirement.is_active
                                  AND requirement.is_required) AS completed_required_count
                        FROM public.rescue_teams team
                        LEFT JOIN public.profiles verifier ON verifier.id = team.verified_by
                        WHERE team.id = ?
                        """, (rs, rowNum) -> {
                    var verifiedAt = rs.getTimestamp("verified_at");
                    return new VerificationReadiness(
                            rs.getString("name"),
                            rs.getString("status"),
                            rs.getString("contract_reference"),
                            rs.getString("verified_by_name"),
                            verifiedAt == null ? null : verifiedAt.toInstant(),
                            rs.getInt("active_provider_count"),
                            rs.getInt("capability_count"),
                            rs.getInt("completed_required_count"),
                            rs.getInt("required_count"));
                }, teamId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy đội cứu hộ."));
    }

    private void requireStaff(Actor actor) {
        if (!"dispatcher".equals(actor.role()) && !"admin".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "STAFF_ROLE_REQUIRED", "Chức năng chỉ dành cho điều phối viên.");
        }
    }

    private void requireAdmin(Actor actor) {
        if (!"admin".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ROLE_REQUIRED", "Chức năng chỉ dành cho quản trị viên vận hành.");
        }
    }

    private String lockActiveRole(UUID userId) {
        return jdbc.query("""
                        SELECT role FROM public.profiles
                        WHERE id = ? AND is_active
                        FOR UPDATE
                        """, (rs, rowNum) -> rs.getString("role"), userId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND",
                        "Không tìm thấy tài khoản đang hoạt động."));
    }

    private static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

}

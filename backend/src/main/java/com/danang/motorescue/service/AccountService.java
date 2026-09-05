package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import com.danang.motorescue.model.ApiModels.PushDeviceRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AccountService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;

    public AccountService(JdbcTemplate jdbc, TransactionTemplate transactions, AuditService audit) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
    }

    public void requestDeletion(Actor actor) {
        if ("admin".equals(actor.role())) {
            throw new ApiException(HttpStatus.CONFLICT, "ADMIN_DELETION_REQUIRES_HANDOVER",
                    "Admin phải bàn giao quyền vận hành trước khi yêu cầu xóa tài khoản.");
        }
        transactions.executeWithoutResult(status -> {
            jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null, actor.id().toString());
            Boolean hasActiveWork = jdbc.queryForObject("""
                    SELECT EXISTS(
                      SELECT 1 FROM public.rescue_requests
                      WHERE (customer_id = ? OR assigned_provider_id = ?)
                        AND status NOT IN ('completed', 'cancelled')
                    )
                    """, Boolean.class, actor.id(), actor.id());
            if (Boolean.TRUE.equals(hasActiveWork)) {
                throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_REQUEST_EXISTS",
                        "Hãy hoàn tất hoặc hủy ca đang hoạt động trước khi xóa tài khoản.");
            }
            audit.record(actor.id(), "account.deletion_requested", "profile", actor.id());
            jdbc.update("""
                    UPDATE public.profiles
                    SET deletion_requested_at = NOW(), is_active = FALSE
                    WHERE id = ? AND deletion_requested_at IS NULL
                    """, actor.id());
            jdbc.update("""
                    UPDATE public.provider_members
                    SET is_available = FALSE, last_latitude = NULL, last_longitude = NULL,
                        location_accuracy_m = NULL
                    WHERE user_id = ?
                    """, actor.id());
            jdbc.update("UPDATE public.push_devices SET is_active = FALSE WHERE user_id = ?", actor.id());
        });
    }

    public void registerPushDevice(Actor actor, PushDeviceRequest input) {
        transactions.executeWithoutResult(status -> {
            jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null,
                    "push-installation:" + input.installationId());
            jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null,
                    "push-token:" + input.token());
            // A token may survive account switching or an app reinstall. Possession of
            // the current Expo token plus an authenticated session is the registration proof.
            jdbc.update("""
                    DELETE FROM public.push_devices
                    WHERE installation_id = ? OR expo_push_token = ?
                    """, input.installationId(), input.token());
            jdbc.update("""
                INSERT INTO public.push_devices(user_id, installation_id, expo_push_token, platform)
                VALUES (?, ?, ?, ?)
                """, actor.id(), input.installationId(), input.token(), input.platform());
        });
    }

    public void unregisterPushDevice(Actor actor, String token, UUID installationId) {
        jdbc.update("""
                DELETE FROM public.push_devices
                WHERE user_id = ? AND expo_push_token = ? AND installation_id = ?
                """, actor.id(), token, installationId);
    }

    public void unregisterAllPushDevices(Actor actor) {
        int changed = jdbc.update(
                "UPDATE public.push_devices SET is_active = FALSE WHERE user_id = ? AND is_active",
                actor.id());
        audit.record(actor.id(), "push_devices.revoked_all", "profile", actor.id());
    }
}

package com.danang.motorescue.service;

import static com.danang.motorescue.service.RescueJdbcSupport.getBoolean;
import static com.danang.motorescue.service.RescueJdbcSupport.getDouble;
import static com.danang.motorescue.service.RescueJdbcSupport.getInteger;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class RescueRequestAccess {
    private final JdbcTemplate jdbc;

    RescueRequestAccess(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    RescueRequestData findForDetails(Actor actor, UUID requestId) {
        RescueRequestData row = jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote, service.requires_destination,
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
                actor.locale(), requestId, actor.id(), actor.id(), actor.role());
        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu cứu hộ.");
        }
        return row;
    }

    RescueRequestData requireParticipant(Actor actor, UUID requestId) {
        RescueRequestData row = jdbc.query("""
                SELECT rr.*,
                       CASE WHEN ? = 'en' THEN service.label_en ELSE service.label_vi END AS service_label,
                       service.icon_name, service.requires_quote, service.requires_destination,
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

    void setActor(UUID actorId) {
        jdbc.queryForObject("SELECT set_config('app.actor_id', ?, TRUE)", String.class, actorId.toString());
    }

    void requireCustomer(Actor actor) {
        if (!"customer".equals(actor.role())) throw forbidden();
    }

    ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "REQUEST_ACCESS_DENIED", "Bạn không có quyền với yêu cầu này.");
    }

    ApiException stale() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "REQUEST_VERSION_CONFLICT",
                "Yêu cầu đã thay đổi. Hãy tải lại trước khi thao tác.");
    }

    ApiException invalidAction() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "INVALID_REQUEST_ACTION",
                "Thao tác không phù hợp với trạng thái hiện tại.");
    }

    private RescueRequestData mapRequest(ResultSet rs) throws SQLException {
        return new RescueRequestData(
                rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class), rs.getString("status"),
                rs.getString("service_code"), rs.getString("service_label"), rs.getString("icon_name"),
                rs.getBoolean("requires_quote"), rs.getBoolean("requires_destination"),
                rs.getString("vehicle_power_type"), rs.getString("vehicle_description"),
                rs.getString("work_type"),
                rs.getString("pickup_area_label"), rs.getString("pickup_note"), rs.getDouble("pickup_latitude"),
                rs.getDouble("pickup_longitude"), rs.getString("destination_area_label"),
                rs.getString("destination_note"), getDouble(rs, "destination_latitude"),
                getDouble(rs, "destination_longitude"), rs.getObject("assigned_provider_id", UUID.class),
                rs.getString("provider_name"), rs.getString("provider_contact_phone"),
                rs.getString("provider_team_name"), rs.getString("rescue_vehicle_label"),
                getInteger(rs, "road_distance_m"), getInteger(rs, "eta_minutes"),
                rs.getString("routing_status"), rs.getString("location_precision"),
                rs.getString("cancellation_code"), rs.getString("cancellation_stage"),
                rs.getString("cancellation_reason"), rs.getBoolean("is_late_cancellation"),
                getBoolean(rs, "provider_near_pickup_on_cancel"), rs.getInt("version"),
                rs.getTimestamp("requested_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}

package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PersonalHistoryService {
    private final JdbcTemplate jdbc;
    public PersonalHistoryService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void hide(Actor actor, UUID id) {
        String owner = switch (actor.role()) {
            case "customer" -> "customer_id";
            case "provider" -> "assigned_provider_id";
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "PERSONAL_HISTORY_ONLY", "Chỉ xóa lịch sử cá nhân.");
        };
        // One statement handles all pages, ownership and terminal state atomically.
        int changed = jdbc.update("""
                INSERT INTO public.hidden_request_history(user_id, request_id)
                SELECT ?, id FROM public.rescue_requests
                WHERE %s = ? AND status IN ('completed', 'cancelled')
                  AND (?::uuid IS NULL OR id = ?)
                ON CONFLICT DO NOTHING
                """.formatted(owner), actor.id(), actor.id(), id, id);
        if (id != null && changed == 0) {
            Boolean alreadyHidden = jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM public.hidden_request_history WHERE user_id=? AND request_id=?)",
                    Boolean.class, actor.id(), id);
            if (!Boolean.TRUE.equals(alreadyHidden)) throw new ApiException(HttpStatus.NOT_FOUND,
                    "CLOSED_CASE_NOT_FOUND", "Không tìm thấy ca đã kết thúc thuộc tài khoản của bạn.");
        }
    }
}

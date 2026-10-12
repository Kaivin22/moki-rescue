package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class WorkingHoursService {
    public record Day(@Min(1) @Max(7) int dayOfWeek,
                      @Min(0) @Max(1439) int opensMinute,
                      @Min(1) @Max(1440) int closesMinute) {}
    public record Update(@NotNull Boolean paused, @Min(0) long expectedVersion,
                         @NotNull @Size(max = 7) List<@NotNull @Valid Day> days) {}
    public record Schedule(String timezone, boolean paused, long version, Instant receivingUntil, List<Day> days) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;

    public WorkingHoursService(JdbcTemplate jdbc, TransactionTemplate transactions, AuditService audit) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.audit = audit;
    }

    public Schedule forAdmin(Actor actor, UUID teamId) {
        requireRole(actor, "admin");
        return read(teamId);
    }

    public Schedule forProvider(Actor actor) {
        requireRole(actor, "provider");
        UUID teamId = jdbc.query("SELECT team_id FROM public.provider_members WHERE user_id = ?",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null, actor.id());
        if (teamId == null) throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Chưa được xếp vào cửa hàng.");
        return read(teamId);
    }

    public Schedule save(Actor actor, UUID teamId, Update input) {
        requireRole(actor, "admin");
        validate(input);
        return transactions.execute(status -> {
            List<Long> versions = jdbc.query(
                    "SELECT working_hours_version FROM public.rescue_teams WHERE id = ? FOR UPDATE",
                    (rs, row) -> rs.getLong(1), teamId);
            if (versions.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy cửa hàng.");
            if (versions.getFirst() != input.expectedVersion()) {
                throw new ApiException(HttpStatus.CONFLICT, "WORKING_HOURS_CHANGED", "Lịch đã được sửa ở nơi khác. Hãy tải lại trước khi lưu.");
            }
            // Team -> providers, same order as other shop edits. Do not acquire request/offer
            // locks here: acceptance holds request -> offer -> provider. Expiry rematches later.
            jdbc.query("SELECT user_id FROM public.provider_members WHERE team_id = ? ORDER BY user_id FOR UPDATE",
                    (rs, row) -> rs.getObject(1, UUID.class), teamId);
            jdbc.update("UPDATE public.provider_members SET is_available = FALSE WHERE team_id = ? AND is_available", teamId);
            jdbc.update("DELETE FROM public.team_working_hours WHERE team_id = ?", teamId);
            for (Day day : input.days()) {
                jdbc.update("INSERT INTO public.team_working_hours(team_id, day_of_week, opens_minute, closes_minute) VALUES (?, ?, ?, ?)",
                        teamId, day.dayOfWeek(), day.opensMinute(), day.closesMinute());
            }
            jdbc.update("UPDATE public.rescue_teams SET receiving_paused = ?, working_hours_version = working_hours_version + 1 WHERE id = ?",
                    input.paused(), teamId);
            audit.record(actor.id(), "team.working_hours.updated", "rescue_team", teamId);
            // No assigned case is modified; providers must explicitly become ready again.
            return read(teamId);
        });
    }

    private Schedule read(UUID teamId) {
        // Metadata and day rows use the same snapshot to avoid torn reads during edits.
        Schedule result = jdbc.query("""
                SELECT team.receiving_paused, team.working_hours_version,
                       public.api_team_receiving_until(team.id, statement_timestamp()) AS receiving_until,
                       hours.day_of_week, hours.opens_minute, hours.closes_minute
                FROM public.rescue_teams team
                LEFT JOIN public.team_working_hours hours ON hours.team_id = team.id
                WHERE team.id = ? ORDER BY hours.day_of_week
                """, rs -> {
            if (!rs.next()) return null;
            boolean paused = rs.getBoolean("receiving_paused");
            long version = rs.getLong("working_hours_version");
            var end = rs.getTimestamp("receiving_until");
            var days = new java.util.ArrayList<Day>();
            do {
                if (rs.getObject("day_of_week") != null) days.add(new Day(rs.getInt("day_of_week"),
                        rs.getInt("opens_minute"), rs.getInt("closes_minute")));
            } while (rs.next());
            return new Schedule("Asia/Ho_Chi_Minh", paused, version, end == null ? null : end.toInstant(), List.copyOf(days));
        }, teamId);
        if (result == null) throw new ApiException(HttpStatus.NOT_FOUND, "TEAM_NOT_FOUND", "Không tìm thấy cửa hàng.");
        return result;
    }

    static void validate(Update input) {
        if (input == null || input.paused() == null || input.expectedVersion() < 0
                || input.days() == null || input.days().size() > 7) throw invalidHours();
        boolean[] days = new boolean[7];
        boolean[] occupied = new boolean[7 * 1440];
        for (Day day : input.days()) {
            if (day == null || day.dayOfWeek() < 1 || day.dayOfWeek() > 7
                    || days[day.dayOfWeek() - 1] || day.opensMinute() < 0 || day.opensMinute() >= 1440
                    || day.closesMinute() < 1 || day.closesMinute() > 1440
                    || day.opensMinute() == day.closesMinute()) throw invalidHours();
            days[day.dayOfWeek() - 1] = true;
            int duration = day.closesMinute() - day.opensMinute();
            if (duration < 0) duration += 1440;
            int start = (day.dayOfWeek() - 1) * 1440 + day.opensMinute();
            for (int minute = start; minute < start + duration; minute++) {
                int index = minute % occupied.length;
                if (occupied[index]) throw invalidHours();
                occupied[index] = true;
            }
        }
    }

    private static ApiException invalidHours() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORKING_HOURS",
                "Mỗi ngày tối đa một khung giờ, không trùng lặp. Ca qua đêm thuộc ngày bắt đầu; cả ngày là 00:00–24:00.");
    }

    private static void requireRole(Actor actor, String role) {
        if (!role.equals(actor.role())) throw new ApiException(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Không có quyền quản lý lịch này.");
    }
}

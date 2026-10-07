package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperatorStatisticsService {
    public record DailyCount(LocalDate date, long count) {}
    public record StatusCount(String status, long count) {}
    public record Summary(long openCases, long waitingCases, long verifiedTeams, long openAlerts) {}
    public record Statistics(String timezone, LocalDate fromDate, LocalDate toDate,
            Summary summary, List<DailyCount> daily, List<StatusCount> statuses) {}
    private final JdbcTemplate jdbc;
    public OperatorStatisticsService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Statistics statistics(Actor actor) {
        if (!"admin".equals(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Chỉ quản trị viên được xem thống kê.");
        }
        var zone = ZoneId.of("Asia/Ho_Chi_Minh");
        var today = LocalDate.now(zone);
        var from = today.minusDays(6);
        var start = Timestamp.from(from.atStartOfDay(zone).toInstant());
        var end = Timestamp.from(today.plusDays(1).atStartOfDay(zone).toInstant());
        Summary summary = jdbc.queryForObject("""
            SELECT
              (SELECT COUNT(*) FROM public.rescue_requests WHERE status NOT IN ('completed','cancelled')) AS open_cases,
              (SELECT COUNT(*) FROM public.rescue_requests WHERE status IN ('searching','offered','no_provider','needs_dispatch')) AS waiting_cases,
              (SELECT COUNT(*) FROM public.rescue_teams WHERE status = 'verified') AS verified_teams,
              (SELECT COUNT(*) FROM public.case_attention_flags WHERE status = 'open') AS open_alerts
            """, (rs, row) -> new Summary(rs.getLong("open_cases"), rs.getLong("waiting_cases"),
                rs.getLong("verified_teams"), rs.getLong("open_alerts")));
        List<DailyCount> counts = jdbc.query("""
            SELECT (requested_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, COUNT(*) AS count
            FROM public.rescue_requests WHERE requested_at >= ? AND requested_at < ?
            GROUP BY day ORDER BY day
            """, (rs, row) -> new DailyCount(rs.getDate("day").toLocalDate(), rs.getLong("count")), start, end);
        List<DailyCount> daily = from.datesUntil(today.plusDays(1))
                .map(date -> new DailyCount(date, counts.stream().filter(day -> day.date().equals(date))
                        .mapToLong(DailyCount::count).sum())).toList();
        List<StatusCount> statuses = jdbc.query("""
            SELECT status, COUNT(*) AS count FROM public.rescue_requests
            WHERE requested_at >= ? AND requested_at < ? GROUP BY status ORDER BY status
            """, (rs, row) -> new StatusCount(rs.getString("status"), rs.getLong("count")), start, end);
        return new Statistics(zone.getId(), from, today, summary, daily, statuses);
    }
}

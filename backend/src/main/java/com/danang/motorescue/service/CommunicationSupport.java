package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.CommunicationModels.Page;
import com.danang.motorescue.web.ApiException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

final class CommunicationSupport {
    private CommunicationSupport() {}
    static boolean admin(Actor actor) { return "admin".equals(actor.role()); }
    static void requireAdmin(Actor actor) {
        if (!admin(actor)) throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ROLE_REQUIRED", "Chỉ quản trị viên được thực hiện.");
    }
    static ApiException missing() { return new ApiException(HttpStatus.NOT_FOUND, "COMMUNICATION_NOT_FOUND", "Không tìm thấy nội dung hoặc bạn không có quyền truy cập."); }
    static ApiException conflict() { return new ApiException(HttpStatus.CONFLICT, "COMMUNICATION_CHANGED", "Nội dung đã thay đổi. Hãy tải lại trước khi thao tác."); }
    static String clean(String value, int min, int max) {
        if (value == null || value.trim().length() < min || value.trim().length() > max)
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nội dung trống, quá ngắn hoặc quá dài.");
        return value.trim();
    }
    static void lockActor(JdbcTemplate jdbc, Actor actor) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 11))", Object.class, actor.id().toString());
    }
    static <T> Page<T> page(JdbcTemplate jdbc, String sql, List<Object> parameters, Instant before, UUID beforeId,
            int limit, RowMapper<T> mapper, Function<T, Instant> time, Function<T, UUID> id) {
        if ((before == null) != (beforeId == null))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "Cần đủ hai giá trị phân trang.");
        int size = Math.max(1, Math.min(100, limit));
        var args = new ArrayList<>(parameters);
        if (before != null) {
            sql += " AND (t.created_at, t.id) < (?, ?)";
            args.add(Timestamp.from(before)); args.add(beforeId);
        }
        sql += " ORDER BY t.created_at DESC, t.id DESC LIMIT ?";
        args.add(size + 1);
        var rows = jdbc.query(sql, mapper, args.toArray());
        var items = List.copyOf(rows.subList(0, Math.min(size, rows.size())));
        T last = rows.size() > size ? items.get(items.size() - 1) : null;
        return new Page<>(items, last == null ? null : time.apply(last), last == null ? null : id.apply(last));
    }
}

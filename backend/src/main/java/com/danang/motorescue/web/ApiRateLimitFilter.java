package com.danang.motorescue.web;

import com.danang.motorescue.config.ApiRateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class ApiRateLimitFilter extends OncePerRequestFilter {
    private final ApiRateLimitProperties properties;
    private final JdbcTemplate jdbc;

    public ApiRateLimitFilter(ApiRateLimitProperties properties, JdbcTemplate jdbc) {
        this.properties = properties;
        this.jdbc = jdbc;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !isMutation(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String category = category(request.getRequestURI());
        int limit = limit(category);
        int count;
        try {
            UUID subjectId = UUID.fromString(authentication.getName());
            Integer stored = jdbc.queryForObject("""
                    INSERT INTO public.api_rate_limit_windows(
                      subject_id, category, window_start, request_count
                    ) VALUES (?, ?, date_trunc('minute', NOW()), 1)
                    ON CONFLICT (subject_id, category, window_start)
                    DO UPDATE SET request_count = public.api_rate_limit_windows.request_count + 1
                    RETURNING request_count
                    """, Integer.class, subjectId, category);
            count = stored == null ? limit + 1 : stored;
        } catch (IllegalArgumentException exception) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        } catch (DataAccessException exception) {
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"code\":\"DATABASE_UNAVAILABLE\",\"message\":\"Dịch vụ tạm thời không khả dụng.\"}");
            return;
        }
        if (count > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"code\":\"API_RATE_LIMITED\",\"message\":\"Bạn thao tác quá nhanh. Vui lòng thử lại sau.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static boolean isMutation(String method) {
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private static String category(String uri) {
        if (uri.startsWith("/api/assistant/")) return "assistant";
        if (uri.equals("/api/provider/location") || uri.matches("^/api/provider/requests/[^/]+/location$")) {
            return "location";
        }
        return "mutation";
    }

    private int limit(String category) {
        return switch (category) {
            case "assistant" -> properties.assistantAttemptsPerMinute();
            case "location" -> properties.locationUpdatesPerMinute();
            default -> properties.mutationsPerMinute();
        };
    }
}

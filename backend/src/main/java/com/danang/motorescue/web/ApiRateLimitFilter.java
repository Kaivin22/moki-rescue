package com.danang.motorescue.web;

import com.danang.motorescue.config.ApiRateLimitProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class ApiRateLimitFilter extends OncePerRequestFilter {
    private record Counter(long minute, int count) {}

    private final ApiRateLimitProperties properties;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final AtomicLong requests = new AtomicLong();

    public ApiRateLimitFilter(ApiRateLimitProperties properties) {
        this.properties = properties;
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

        long minute = System.currentTimeMillis() / 60_000L;
        String category = category(request.getRequestURI());
        int limit = limit(category);
        String key = authentication.getName() + ':' + category;
        AtomicBoolean allowed = new AtomicBoolean(false);
        counters.compute(key, (ignored, current) -> {
            if (current == null || current.minute() != minute) {
                allowed.set(true);
                return new Counter(minute, 1);
            }
            if (current.count() >= limit) return current;
            allowed.set(true);
            return new Counter(minute, current.count() + 1);
        });

        if (requests.incrementAndGet() % 1_000 == 0 && counters.size() > 2_000) {
            counters.entrySet().removeIf(entry -> entry.getValue().minute() < minute - 1);
        }
        if (!allowed.get()) {
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

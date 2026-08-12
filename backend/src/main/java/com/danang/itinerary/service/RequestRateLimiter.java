package com.danang.itinerary.service;

import com.danang.itinerary.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RequestRateLimiter {
    private record Window(long minute, int count) {}
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock = Clock.systemUTC();
    @Value("${app.rate-limit.requests-per-minute:20}") private int limit;

    public void check(String key) {
        long minute = clock.instant().getEpochSecond() / 60;
        Window updated = windows.compute(key, (ignored, old) ->
            old == null || old.minute != minute ? new Window(minute, 1) : new Window(minute, old.count + 1));
        if (updated.count > limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng thử lại sau.");
        }
        if (windows.size() > 10_000) windows.entrySet().removeIf(entry -> entry.getValue().minute < minute - 2);
    }
}

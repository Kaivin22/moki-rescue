package com.danang.itinerary.service;

import com.danang.itinerary.entity.Profile;
import com.danang.itinerary.repository.ProfileRepository;
import com.danang.itinerary.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiAccessService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final ProfileRepository profiles;
    @Value("${app.ai-quota.free-daily:8}") private int freeDaily;
    @Value("${app.ai-quota.vip-daily:80}") private int vipDaily;

    @Transactional
    public Profile consumeChat(UUID userId) {
        Profile profile = lockedActiveProfile(userId);
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        if (profile.getAiMsgResetDate() == null || profile.getAiMsgResetDate().isBefore(today)) {
            profile.setAiMsgResetDate(today);
            profile.setAiMsgCount(0);
        }
        int used = profile.getAiMsgCount() == null ? 0 : profile.getAiMsgCount();
        int limit = isVip(profile) ? vipDaily : freeDaily;
        if (used >= limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "AI_DAILY_QUOTA_EXCEEDED", "Bạn đã dùng hết lượt AI hôm nay.");
        }
        profile.setAiMsgCount(used + 1);
        return profile;
    }

    @Transactional
    public void refundChat(UUID userId) {
        Profile profile = profiles.findByIdForUpdate(userId).orElse(null);
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        if (profile == null || !today.equals(profile.getAiMsgResetDate())) return;
        int used = profile.getAiMsgCount() == null ? 0 : profile.getAiMsgCount();
        if (used > 0) profile.setAiMsgCount(used - 1);
    }

    @Transactional(readOnly = true)
    public Profile requireVip(UUID userId) {
        Profile profile = profiles.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người dùng."));
        if (Boolean.TRUE.equals(profile.getIsBanned()) || !isVip(profile)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "VIP_REQUIRED", "Gói VIP không còn hiệu lực.");
        }
        return profile;
    }

    private Profile lockedActiveProfile(UUID userId) {
        Profile profile = profiles.findByIdForUpdate(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người dùng."));
        if (Boolean.TRUE.equals(profile.getIsBanned())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_BANNED", "Tài khoản đã bị khóa.");
        }
        return profile;
    }

    private boolean isVip(Profile profile) {
        boolean status = "vip".equals(profile.getVipStatus());
        boolean validTime = profile.getVipExpiresAt() != null && profile.getVipExpiresAt().isAfter(ZonedDateTime.now(BUSINESS_ZONE));
        return status && validTime;
    }
}

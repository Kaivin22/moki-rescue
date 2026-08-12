package com.danang.itinerary.service;

import com.danang.itinerary.entity.Profile;
import com.danang.itinerary.repository.ProfileRepository;
import com.danang.itinerary.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiAccessServiceTest {
    private final ProfileRepository repository = mock(ProfileRepository.class);
    private final AiAccessService service = new AiAccessService(repository);
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void configure() {
        ReflectionTestUtils.setField(service, "freeDaily", 2);
        ReflectionTestUtils.setField(service, "vipDaily", 5);
    }

    @Test
    void resetsDailyCounterAndConsumesOneMessage() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Profile profile = profile("free", 8, today.minusDays(1));
        when(repository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile));

        service.consumeChat(userId);

        assertThat(profile.getAiMsgCount()).isEqualTo(1);
        assertThat(profile.getAiMsgResetDate()).isEqualTo(today);
    }

    @Test
    void rejectsWhenDailyQuotaIsExhausted() {
        Profile profile = profile("free", 2, LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        when(repository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile));
        assertThatThrownBy(() -> service.consumeChat(userId))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("hết lượt");
    }

    @Test
    void refundsReservedMessageWhenUpstreamFails() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Profile profile = profile("free", 1, today);
        when(repository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile));

        service.refundChat(userId);

        assertThat(profile.getAiMsgCount()).isZero();
    }

    @Test
    void doesNotRefundAStaleCounter() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Profile profile = profile("free", 1, today.minusDays(1));
        when(repository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile));

        service.refundChat(userId);

        assertThat(profile.getAiMsgCount()).isEqualTo(1);
    }

    private Profile profile(String status, int count, LocalDate reset) {
        Profile profile = new Profile();
        profile.setId(userId);
        profile.setVipStatus(status);
        profile.setAiMsgCount(count);
        profile.setAiMsgResetDate(reset);
        profile.setIsBanned(false);
        return profile;
    }
}

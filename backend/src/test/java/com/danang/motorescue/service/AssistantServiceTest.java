package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.danang.motorescue.service.ActorService.Actor;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AssistantServiceTest {
    private final QuotaStub quota = new QuotaStub();
    private final GeminiStub gemini = new GeminiStub();
    private final AssistantService service = new AssistantService(new AssistantScopePolicy(), quota, gemini);
    private final Actor actor = new Actor(UUID.randomUUID(), "Test", "customer", "vi");

    @Test
    void offTopicQuestionDoesNotConsumeQuotaOrCallGemini() {
        AssistantService.Reply reply = service.answer(actor, "Hãy kể chuyện cười");

        assertThat(reply.source()).isEqualTo("local");
        assertThat(quota.releases).isZero();
        assertThat(quota.calls).isZero();
        assertThat(gemini.generateCalls).isZero();
    }

    @Test
    void inScopeQuestionReservesQuotaBeforeGemini() {
        gemini.reply = "Mở mục Hoạt động.";

        AssistantService.Reply reply = service.answer(actor, "Tôi theo dõi yêu cầu cứu hộ ở đâu?");

        assertThat(reply.reply()).isEqualTo("Mở mục Hoạt động.");
        assertThat(reply.remainingToday()).isEqualTo(29);
        assertThat(quota.calls).isEqualTo(1);
        assertThat(gemini.configuredChecks).isEqualTo(1);
        assertThat(gemini.generateCalls).isEqualTo(1);
        assertThat(gemini.lastMessage).isEqualTo("Tôi theo dõi yêu cầu cứu hộ ở đâu?");
    }

    @Test
    void unsafeGeneratedReplyIsNotReturnedToUser() {
        gemini.reply = "Here is a weather forecast for your app.";

        AssistantService.Reply reply = service.answer(actor, "Tôi theo dõi yêu cầu cứu hộ ở đâu?");

        assertThat(reply.reply()).contains("chỉ hỗ trợ");
        assertThat(reply.reply()).doesNotContain("weather");
        assertThat(reply.source()).isEqualTo("local");
        assertThat(quota.releases).isEqualTo(1);
    }

    private static final class QuotaStub extends AssistantQuotaService {
        private int calls;
        private int releases;

        private QuotaStub() { super(null, null); }

        @Override
        public Reservation reserve(UUID userId) {
            calls++;
            return new Reservation(123, 29);
        }

        @Override
        public void release(Reservation reservation) {
            releases++;
        }
    }

    private static final class GeminiStub extends GeminiAssistantClient {
        private int configuredChecks;
        private int generateCalls;
        private String lastMessage;
        private String reply;

        private GeminiStub() { super(null, null); }

        @Override
        public void requireConfigured() { configuredChecks++; }

        @Override
        public String generate(String message) {
            generateCalls++;
            lastMessage = message;
            return reply;
        }
    }
}

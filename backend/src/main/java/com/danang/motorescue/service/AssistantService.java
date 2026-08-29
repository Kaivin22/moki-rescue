package com.danang.motorescue.service;

import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.service.AssistantScopePolicy.Decision;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {
    public record Reply(String reply, String source, Integer remainingToday) {}

    private final AssistantScopePolicy scope;
    private final AssistantQuotaService quota;
    private final GeminiAssistantClient gemini;

    public AssistantService(
            AssistantScopePolicy scope,
            AssistantQuotaService quota,
            GeminiAssistantClient gemini) {
        this.scope = scope;
        this.quota = quota;
        this.gemini = gemini;
    }

    public Reply answer(Actor actor, String message) {
        Decision decision = scope.classify(message);
        if (decision.disposition() != AssistantScopePolicy.Disposition.IN_SCOPE) {
            return new Reply(decision.reply(), "local", null);
        }
        gemini.requireConfigured();
        AssistantQuotaService.Reservation reservation = quota.reserve(actor.id());
        String generated;
        try {
            generated = gemini.generate(message);
        } catch (RuntimeException exception) {
            quota.release(reservation);
            throw exception;
        }
        if (!scope.allowsGeneratedReply(generated)) {
            quota.release(reservation);
            return new Reply(scope.outOfScopeReply(message), "local", reservation.remainingToday() + 1);
        }
        return new Reply(generated, "gemini", reservation.remainingToday());
    }
}

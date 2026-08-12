package com.danang.itinerary.controller;

import com.danang.itinerary.config.SecurityConfig;
import com.danang.itinerary.service.AiAccessService;
import com.danang.itinerary.service.GeminiService;
import com.danang.itinerary.service.RequestRateLimiter;
import com.danang.itinerary.service.RouteOptimizerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import java.util.List;

@WebMvcTest(value = AIController.class, properties = {
    "SUPABASE_URL=https://example.supabase.co",
    "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://example.supabase.co/auth/v1",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.supabase.co/auth/v1/.well-known/jwks.json"
})
@Import(SecurityConfig.class)
class AISecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean GeminiService geminiService;
    @MockitoBean AiAccessService accessService;
    @MockitoBean RequestRateLimiter rateLimiter;
    @MockitoBean RouteOptimizerService optimizerService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void rejectsAnonymousAiRequest() throws Exception {
        mvc.perform(post("/api/ai/chat")
                .contentType("application/json")
                .content("{\"prompt\":\"hello\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidNestedChatHistory() throws Exception {
        mvc.perform(post("/api/ai/chat")
                .with(jwt().jwt(token -> token.subject("11111111-1111-1111-1111-111111111111")))
                .contentType("application/json")
                .content("{\"prompt\":\"hello\",\"history\":[{\"text\":\"\",\"isUser\":true}]}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void optimizeApiUsesTheCamelCaseMobileContract() throws Exception {
        when(optimizerService.optimize(any())).thenReturn(
            new RouteOptimizerService.OptimizeResponse(
                List.of(List.of("p1")),
                2.5,
                12,
                true,
                "road",
                "fastest_route_time",
                true));

        mvc.perform(post("/api/ai/optimize")
                .with(jwt().jwt(token -> token.subject("11111111-1111-1111-1111-111111111111")))
                .contentType("application/json")
                .content("{\"places\":[{\"id\":\"p1\",\"lat\":16.05,\"lng\":108.2}],\"numDays\":1,\"transport\":\"car\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalDistanceKm").value(2.5))
            .andExpect(jsonPath("$.totalTravelTimeMin").value(12))
            .andExpect(jsonPath("$.roadDataUsed").value(true))
            .andExpect(jsonPath("$.routingStatus").value("road"))
            .andExpect(jsonPath("$.objective").value("fastest_route_time"))
            .andExpect(jsonPath("$.exactOrder").value(true));
    }
}

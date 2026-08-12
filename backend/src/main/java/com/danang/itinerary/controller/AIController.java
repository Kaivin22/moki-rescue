package com.danang.itinerary.controller;

import com.danang.itinerary.service.GeminiService;
import com.danang.itinerary.service.AiAccessService;
import com.danang.itinerary.service.RequestRateLimiter;
import com.danang.itinerary.service.RouteOptimizerService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final GeminiService geminiService;
    private final AiAccessService accessService;
    private final RequestRateLimiter rateLimiter;
    private final RouteOptimizerService optimizerService;

    @PostMapping("/optimize")
    public ResponseEntity<RouteOptimizerService.OptimizeResponse> optimize(
            JwtAuthenticationToken authentication,
            @RequestBody RouteOptimizerService.OptimizeRequest request) {
        var userId = userId(authentication);
        rateLimiter.check(userId + ":optimize");
        accessService.requireVip(userId);
        return ResponseEntity.ok(optimizerService.optimize(request));
    }

    @PostMapping("/optimize-review")
    public ResponseEntity<String> reviewOptimization(
            JwtAuthenticationToken authentication,
            @Valid @RequestBody OptimizeReviewRequest request) {
        var userId = userId(authentication);
        rateLimiter.check(userId + ":review");
        accessService.requireVip(userId);
        accessService.consumeChat(userId);
        String prompt = "Bạn là bộ kiểm định lịch trình Đà Nẵng. Chỉ nhận xét dựa trên JSON được cung cấp; " +
            "không bịa địa điểm. Hãy nêu tối đa 5 thay đổi cụ thể về thứ tự/ngày/giờ và giải thích ngắn. " +
            "Nếu lịch đã hợp lý, nói rõ không cần đổi. JSON: " + request.getItineraryJson();
        try {
            return ResponseEntity.ok(geminiService.generateContent(prompt));
        } catch (RuntimeException error) {
            accessService.refundChat(userId);
            throw error;
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<String> chat(JwtAuthenticationToken authentication, @Valid @RequestBody ChatRequest request) {
        var userId = userId(authentication);
        rateLimiter.check(userId + ":chat");
        accessService.consumeChat(userId);
        // Xây dựng context từ history
        StringBuilder context = new StringBuilder("Bạn là một trợ lý ảo chuyên gia về du lịch Đà Nẵng. Hãy trả lời ngắn gọn, thân thiện và hữu ích.\n");
        if (request.getHistory() != null) {
            // Lấy 4 tin nhắn gần nhất
            int start = Math.max(0, request.getHistory().size() - 4);
            for (int i = start; i < request.getHistory().size(); i++) {
                ChatMessage msg = request.getHistory().get(i);
                context.append(msg.isUser() ? "Khách" : "Trợ lý").append(": ").append(msg.getText()).append("\n");
            }
        }
        context.append("Khách: ").append(request.getPrompt()).append("\nTrợ lý:");

        try {
            String response = geminiService.generateContent(context.toString());
            return ResponseEntity.ok(response);
        } catch (RuntimeException error) {
            accessService.refundChat(userId);
            throw error;
        }
    }

    private java.util.UUID userId(JwtAuthenticationToken authentication) {
        try {
            return java.util.UUID.fromString(authentication.getToken().getSubject());
        } catch (RuntimeException ex) {
            throw new com.danang.itinerary.web.ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "INVALID_SUBJECT", "JWT không chứa user id hợp lệ.");
        }
    }

    @Data
    public static class ChatRequest {
        @NotBlank
        @Size(max = 2000)
        private String prompt;
        @Size(max = 12)
        private List<@Valid ChatMessage> history;
    }

    @Data
    public static class ChatMessage {
        private String id;
        @NotBlank
        @Size(max = 2000)
        private String text;
        private boolean isUser;
        private long timestamp;
    }

    @Data
    public static class OptimizeReviewRequest {
        @NotBlank
        @Size(max = 20000)
        private String itineraryJson;
    }
}

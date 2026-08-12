package com.danang.itinerary.service;

import com.danang.itinerary.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiService {
    private final RestClient geminiRestClient;

    @Value("${app.gemini.api-key:}") private String apiKey;
    @Value("${app.gemini.model:gemini-2.5-flash}") private String model;

    public String generateContent(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED", "Máy chủ chưa cấu hình dịch vụ AI.");
        }
        var body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        try {
            JsonNode response = geminiRestClient.post()
                .uri("/v1beta/models/{model}:generateContent", model)
                .header("x-goog-api-key", apiKey)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
            JsonNode text = response == null ? null : response.at("/candidates/0/content/parts/0/text");
            if (text == null || !text.isTextual() || text.asText().isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_EMPTY_RESPONSE", "AI không trả về nội dung hợp lệ.");
            }
            return text.asText();
        } catch (ApiException e) {
            throw e;
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI_UPSTREAM_ERROR", "Không thể kết nối dịch vụ AI.", e);
        }
    }
}

package com.danang.motorescue.config;

import java.util.Arrays;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String[] allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
        if (this.allowedOrigins.length == 0 || Arrays.stream(this.allowedOrigins).anyMatch(WebConfig::isUnsafeOrigin)) {
            throw new IllegalArgumentException("app.cors.allowed-origins must contain explicit http(s) origins");
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "Idempotency-Key", "Accept-Language")
                .allowCredentials(false)
                .maxAge(3600);
    }

    private static boolean isUnsafeOrigin(String origin) {
        if ("*".equals(origin)) return true;
        try {
            URI uri = URI.create(origin);
            return !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null
                    || uri.getUserInfo() != null
                    || uri.getQuery() != null
                    || uri.getFragment() != null;
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }
}

package com.danang.motorescue.config;

import com.danang.motorescue.web.ApiRateLimitFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ApiRateLimitProperties rateLimitProperties) throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
                            writeSecurityError(response, "AUTH_REQUIRED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            writeSecurityError(response, "ACCESS_DENIED", "Tài khoản không có quyền thực hiện thao tác này.");
                        }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
                .addFilterAfter(new ApiRateLimitFilter(rateLimitProperties), BearerTokenAuthenticationFilter.class)
                .build();
    }

    private static void writeSecurityError(
            jakarta.servlet.http.HttpServletResponse response,
            String code,
            String message) throws java.io.IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
    }
}

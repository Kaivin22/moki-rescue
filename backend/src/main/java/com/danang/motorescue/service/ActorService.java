package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.ProfileResponse;
import com.danang.motorescue.web.ApiException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class ActorService {
    public record Actor(UUID id, String displayName, String role, String locale) {}
    private record Candidate(Actor actor, boolean consented) {}

    private final JdbcTemplate jdbc;
    private final String currentTermsVersion;

    public ActorService(JdbcTemplate jdbc, @Value("${app.legal.current-version}") String currentTermsVersion) {
        this.jdbc = jdbc;
        if (currentTermsVersion == null || !currentTermsVersion.matches("^[A-Za-z0-9._-]{1,30}$")) {
            throw new IllegalArgumentException("app.legal.current-version is invalid");
        }
        this.currentTermsVersion = currentTermsVersion;
    }

    public Actor require(Jwt jwt) {
        final UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SUBJECT", "Phiên đăng nhập không hợp lệ.");
        }

        Candidate candidate = jdbc.query("""
                        SELECT id, display_name, role, locale,
                               terms_accepted_at IS NOT NULL AND terms_version = ? AS consented
                        FROM public.profiles
                        WHERE id = ? AND is_active
                        """, rs -> rs.next()
                        ? new Candidate(
                                new Actor(
                                        rs.getObject("id", UUID.class),
                                        rs.getString("display_name"),
                                        rs.getString("role"),
                                        rs.getString("locale")),
                                rs.getBoolean("consented"))
                        : null, currentTermsVersion, id);
        Candidate active = Optional.ofNullable(candidate).orElseThrow(() -> new ApiException(
                HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Tài khoản chưa sẵn sàng hoặc đã bị vô hiệu hóa."));
        if (!active.consented()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "CONSENT_REQUIRED",
                    "Bạn cần chấp nhận điều khoản và chính sách quyền riêng tư trước khi dùng dịch vụ.");
        }
        return active.actor();
    }

    public Actor requireRole(Jwt jwt, String... roles) {
        Actor actor = require(jwt);
        if (!Set.of(roles).contains(actor.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Tài khoản không có quyền thực hiện thao tác này.");
        }
        return actor;
    }

    public ProfileResponse profile(Jwt jwt) {
        Actor actor = require(jwt);
        return new ProfileResponse(actor.id(), actor.displayName(), actor.role(), actor.locale());
    }
}

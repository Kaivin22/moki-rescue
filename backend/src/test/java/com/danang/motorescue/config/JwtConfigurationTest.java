package com.danang.motorescue.config;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

class JwtConfigurationTest {
    @Test
    void supabaseEcTokensAreSupportedWithoutRemovingClaimValidation() {
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        var properties = yaml.getObject();
        String prefix = "spring.security.oauth2.resourceserver.jwt.";
        assertThat(properties.getProperty(prefix + "jws-algorithms")).isEqualTo("ES256,RS256");
        assertThat(properties.getProperty(prefix + "audiences")).isEqualTo("authenticated");
        assertThat(properties.getProperty(prefix + "issuer-uri")).isEqualTo("${SUPABASE_URL}/auth/v1");
        assertThat(properties.getProperty(prefix + "jwk-set-uri")).isEqualTo("${SUPABASE_URL}/auth/v1/.well-known/jwks.json");
    }
}

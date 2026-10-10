package com.agrisense.gateway.config;

import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/** CORS is off unless ALLOWED_ORIGINS is explicitly set (same-origin deployment through the web rewrite). */
@Configuration
public class CorsConfig {

    static class OrderedCorsWebFilter extends CorsWebFilter implements Ordered {
        OrderedCorsWebFilter(CorsConfigurationSource source) {
            super(source);
        }

        @Override
        public int getOrder() {
            return Ordered.HIGHEST_PRECEDENCE + 10;
        }
    }

    @Bean
    @ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${agrisense.allowed-origins:}')")
    public CorsWebFilter corsWebFilter(GatewayProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.configuredOrigins());
        cfg.setAllowCredentials(true);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        cfg.setAllowedHeaders(List.of("Content-Type", "X-CSRF-Token", "Idempotency-Key", "X-Request-ID"));
        cfg.setExposedHeaders(List.of("X-Request-ID", "Retry-After"));
        cfg.setMaxAge(600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return new OrderedCorsWebFilter(source);
    }
}

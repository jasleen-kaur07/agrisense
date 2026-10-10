package com.agrisense.advisory.config;

import com.agrisense.advisory.web.ProblemWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    JwtDecoder jwtDecoder(AppProps props) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(props.security().jwksUrl())
                .jwsAlgorithm(SignatureAlgorithm.RS256).build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(props.security().issuer()));
        decoder.setJwtValidator(validator);
        return decoder;
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter g = new JwtGrantedAuthoritiesConverter();
        g.setAuthoritiesClaimName("roles");
        g.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter c = new JwtAuthenticationConverter();
        c.setJwtGrantedAuthoritiesConverter(g);
        return c;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, ProblemWriter problems, JwtAuthenticationConverter conv)
            throws Exception {
        http.csrf(c -> c.disable())
            .cors(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/health", "/ready", "/actuator/health/**").permitAll()
                .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .jwt(j -> j.jwtAuthenticationConverter(conv))
                .authenticationEntryPoint((req, res, ex) -> problems.write(req, res, HttpStatus.UNAUTHORIZED,
                        "unauthorized", "Unauthorized", "Authentication is required"))
                .accessDeniedHandler((req, res, ex) -> problems.write(req, res, HttpStatus.FORBIDDEN,
                        "forbidden", "Forbidden", "You do not have access to this resource")))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> problems.write(req, res, HttpStatus.UNAUTHORIZED,
                        "unauthorized", "Unauthorized", "Authentication is required"))
                .accessDeniedHandler((req, res, ex) -> problems.write(req, res, HttpStatus.FORBIDDEN,
                        "forbidden", "Forbidden", "You do not have access to this resource")));
        return http.build();
    }
}

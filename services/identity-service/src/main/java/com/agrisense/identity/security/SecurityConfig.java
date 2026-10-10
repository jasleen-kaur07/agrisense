package com.agrisense.identity.security;

import com.agrisense.identity.domain.UserRepository;
import com.agrisense.identity.service.JwtService;
import com.agrisense.identity.web.ApiException;
import com.agrisense.identity.web.ProblemWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, UserRepository users, ProblemWriter problems) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // replaced by CsrfFilter below (cookie-authenticated requests only)
                .cors(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/health", "/ready", "/.well-known/jwks.json", "/actuator/health/**").permitAll()
                        .requestMatchers("/v1/auth/register", "/v1/auth/login", "/v1/auth/refresh", "/v1/auth/logout",
                                "/v1/auth/forgot", "/v1/auth/reset").permitAll()
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> problems.write(req, res, ApiException.unauthorized("Authentication required.")))
                        .accessDeniedHandler((req, res, ex) -> problems.write(req, res, ApiException.forbidden("Access denied."))))
                .addFilterBefore(new CsrfFilter(problems), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new JwtAuthFilter(jwt, users), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}

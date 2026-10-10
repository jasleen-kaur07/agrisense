package com.agrisense.gateway.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Gateway settings (prefix {@code agrisense}). Env mapping lives in application.yml.
 */
@ConfigurationProperties(prefix = "agrisense")
public class GatewayProperties {

    /** Comma separated ALLOWED_ORIGINS exactly as configured (may be empty). */
    private String allowedOrigins = "";
    private String identityJwksUrl = "http://localhost:8081/.well-known/jwks.json";
    private String issuer = "agrisense-identity";
    private long maxBodyBytes = 1024 * 1024;
    private int jwksTimeoutMs = 2000;
    private int jwksTtlSeconds = 600;
    private int jwksUnknownKidCooldownSeconds = 5;
    private final RateLimit rateLimit = new RateLimit();

    public static class RateLimit {
        private int generalPerMinute = 120;
        private int authPerMinute = 10;

        public int getGeneralPerMinute() { return generalPerMinute; }
        public void setGeneralPerMinute(int v) { this.generalPerMinute = v; }
        public int getAuthPerMinute() { return authPerMinute; }
        public void setAuthPerMinute(int v) { this.authPerMinute = v; }
    }

    /** Origins parsed from the configured list (no trailing slashes, lower-case). */
    public List<String> configuredOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(GatewayProperties::normalizeOrigin)
                .toList();
    }

    /**
     * Origins accepted by the Origin/Referer check. When ALLOWED_ORIGINS is not set we fall back to the
     * local web app so that local development works; CORS stays disabled in that case.
     */
    public List<String> effectiveOrigins() {
        List<String> configured = configuredOrigins();
        return configured.isEmpty() ? List.of("http://localhost:3000") : configured;
    }

    public static String normalizeOrigin(String o) {
        String s = o.trim().toLowerCase();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    public String getAllowedOrigins() { return allowedOrigins; }
    public void setAllowedOrigins(String v) { this.allowedOrigins = v == null ? "" : v; }
    public String getIdentityJwksUrl() { return identityJwksUrl; }
    public void setIdentityJwksUrl(String v) { this.identityJwksUrl = v; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String v) { this.issuer = v; }
    public long getMaxBodyBytes() { return maxBodyBytes; }
    public void setMaxBodyBytes(long v) { this.maxBodyBytes = v; }
    public int getJwksTimeoutMs() { return jwksTimeoutMs; }
    public void setJwksTimeoutMs(int v) { this.jwksTimeoutMs = v; }
    public int getJwksTtlSeconds() { return jwksTtlSeconds; }
    public void setJwksTtlSeconds(int v) { this.jwksTtlSeconds = v; }
    public int getJwksUnknownKidCooldownSeconds() { return jwksUnknownKidCooldownSeconds; }
    public void setJwksUnknownKidCooldownSeconds(int v) { this.jwksUnknownKidCooldownSeconds = v; }
    public RateLimit getRateLimit() { return rateLimit; }
}

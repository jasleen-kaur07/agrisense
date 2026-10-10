package com.agrisense.identity.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("app")
public record AppProperties(
        boolean cookieSecure,
        String mailMode,
        String jwtPrivateKeyPem,
        String adminBootstrapEmail,
        String adminBootstrapPassword,
        @DefaultValue RateLimit rateLimit) {

    /** Attempts allowed per window; counted per client IP or per normalised email. */
    public record RateLimit(
            @DefaultValue("900") int windowSeconds,
            @DefaultValue("30") int loginPerIp,
            @DefaultValue("10") int loginPerEmail,
            @DefaultValue("10") int registerPerIp,
            @DefaultValue("10") int forgotPerIp,
            @DefaultValue("3") int forgotPerEmail) {}
}

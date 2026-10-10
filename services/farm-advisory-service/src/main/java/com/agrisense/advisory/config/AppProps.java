package com.agrisense.advisory.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("advisory")
public record AppProps(Security security, Data data, Alerts alerts) {
    public record Security(String jwksUrl, String issuer) {}

    public record Data(String url, String internalToken, int connectTimeoutMs, int readTimeoutMs,
                       int cbWindowSize, int cbMinCalls, float cbFailureRate, int cbOpenSeconds) {}

    public record Alerts(boolean enabled, long intervalMs, long initialDelayMs, int maxFarmsPerRun) {}
}

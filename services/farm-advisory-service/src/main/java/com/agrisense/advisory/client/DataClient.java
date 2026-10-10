package com.agrisense.advisory.client;

import com.agrisense.advisory.config.AppProps;
import com.agrisense.advisory.config.RequestIdFilter;
import com.agrisense.advisory.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Client for data-service: explicit timeouts, circuit breaker, GET only (no retries). */
@Component
public class DataClient {
    private static final Logger log = LoggerFactory.getLogger(DataClient.class);

    /** Upstream answered 4xx; not a health signal, ignored by the breaker. */
    public static class DataClientException extends RuntimeException {
        public final int status;
        public DataClientException(int status) {
            super("data-service answered " + status);
            this.status = status;
        }
    }

    /** Upstream unreachable / timed out / 5xx; counted by the breaker. */
    public static class DataUnavailableException extends RuntimeException {
        public final boolean unreachable;
        public DataUnavailableException(String m, boolean unreachable) {
            super(m);
            this.unreachable = unreachable;
        }
        public ApiException toApi() {
            return unreachable ? ApiException.unavailable("The data service is temporarily unavailable")
                    : ApiException.badGateway("The data service returned an error");
        }
    }

    private final RestClient rest;
    private final CircuitBreaker breaker;
    private final String token;

    public DataClient(AppProps props) {
        AppProps.Data d = props.data();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofMillis(d.connectTimeoutMs()));
        f.setReadTimeout(Duration.ofMillis(d.readTimeoutMs()));
        this.rest = RestClient.builder().baseUrl(d.url()).requestFactory(f).build();
        this.token = d.internalToken();
        this.breaker = CircuitBreaker.of("data-service", CircuitBreakerConfig.custom()
                .slidingWindowSize(d.cbWindowSize())
                .minimumNumberOfCalls(d.cbMinCalls())
                .failureRateThreshold(d.cbFailureRate())
                .waitDurationInOpenState(Duration.ofSeconds(d.cbOpenSeconds()))
                .ignoreExceptions(DataClientException.class)
                .build());
    }

    private JsonNode get(String template, Object... vars) {
        try {
            return breaker.executeSupplier(() -> doGet(template, vars));
        } catch (CallNotPermittedException e) {
            throw new DataUnavailableException("circuit open", true);
        }
    }

    private JsonNode doGet(String template, Object... vars) {
        try {
            JsonNode body = rest.get().uri(template, vars)
                    .header("X-Internal-Token", token == null ? "" : token)
                    .header(RequestIdFilter.HEADER, requestId())
                    .retrieve().body(JsonNode.class);
            if (body == null) {
                throw new DataUnavailableException("empty response", false);
            }
            return body;
        } catch (HttpClientErrorException e) {
            throw new DataClientException(e.getStatusCode().value());
        } catch (HttpServerErrorException e) {
            log.warn("data-service error status={}", e.getStatusCode().value());
            throw new DataUnavailableException("upstream " + e.getStatusCode().value(), false);
        } catch (ResourceAccessException e) {
            log.warn("data-service unreachable: {}", e.getClass().getSimpleName());
            throw new DataUnavailableException("unreachable", true);
        } catch (RestClientException e) {
            log.warn("data-service call failed: {}", e.getClass().getSimpleName());
            throw new DataUnavailableException("bad response", false);
        }
    }

    private static String requestId() {
        String id = MDC.get(RequestIdFilter.MDC_KEY);
        return id != null ? id : UUID.randomUUID().toString();
    }

    /** Empty when the district is unknown (404). */
    public Optional<JsonNode> location(String stateKey, String districtKey) {
        try {
            return Optional.of(get("/v1/locations/{s}/{d}", stateKey, districtKey));
        } catch (DataClientException e) {
            if (e.status == 404) {
                return Optional.empty();
            }
            throw new DataUnavailableException("unexpected " + e.status, false);
        }
    }

    public JsonNode currentSeason() {
        return get("/v1/seasons/current");
    }

    public JsonNode guide(String state, String district, String season) {
        return get("/v1/regional/guide?state={s}&district={d}&season={x}", state, district, season);
    }

    public JsonNode weather(String state, String district) {
        return get("/v1/weather?state={s}&district={d}", state, district);
    }

    public JsonNode cropHistory(String state, String district, String cropsCsv) {
        return get("/v1/regional/crop-history?state={s}&district={d}&crops={c}", state, district, cropsCsv);
    }
}

package com.agrisense.advisory.client;

import com.agrisense.advisory.config.AppProps;
import com.agrisense.advisory.config.RequestIdFilter;
import com.agrisense.advisory.web.ApiException;
import com.agrisense.advisory.web.Problem;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Client for ml-service (Model 1 soil-test prediction). Explicit timeouts, no retries. */
@Component
public class MlClient {
    private static final Logger log = LoggerFactory.getLogger(MlClient.class);

    private final RestClient rest;
    private final String token;

    public MlClient(AppProps props) {
        AppProps.Ml m = props.ml();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofMillis(m.connectTimeoutMs()));
        f.setReadTimeout(Duration.ofMillis(m.readTimeoutMs()));
        this.rest = RestClient.builder().baseUrl(m.url()).requestFactory(f).build();
        this.token = m.internalToken();
    }

    public JsonNode predictCrop(Map<String, Double> features) {
        try {
            JsonNode body = rest.post().uri("/internal/v1/model1/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Internal-Token", token == null ? "" : token)
                    .header(RequestIdFilter.HEADER, requestId())
                    .body(features)
                    .retrieve().body(JsonNode.class);
            if (body == null) {
                throw ApiException.badGateway("The prediction service returned an empty response");
            }
            return body;
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 422) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "validation", "Validation failed",
                        "Input rejected; nothing was imputed.", fieldErrors(e));
            }
            log.warn("ml-service answered {}", status);
            throw ApiException.unavailable("Crop prediction is not available right now");
        } catch (RestClientException e) {
            log.warn("ml-service call failed: {}", e.getClass().getSimpleName());
            throw ApiException.unavailable("The prediction service is temporarily unavailable");
        }
    }

    private static List<Problem.FieldErr> fieldErrors(HttpClientErrorException e) {
        List<Problem.FieldErr> out = new ArrayList<>();
        try {
            JsonNode errs = e.getResponseBodyAs(JsonNode.class);
            if (errs != null && errs.has("errors")) {
                for (JsonNode n : errs.get("errors")) {
                    out.add(new Problem.FieldErr(n.path("field").asText(), n.path("message").asText()));
                }
            }
        } catch (RuntimeException ignored) {
            // fall through with whatever was parsed
        }
        return out;
    }

    private static String requestId() {
        String id = MDC.get(RequestIdFilter.MDC_KEY);
        return id != null ? id : UUID.randomUUID().toString();
    }
}

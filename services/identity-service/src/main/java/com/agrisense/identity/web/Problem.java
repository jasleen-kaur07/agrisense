package com.agrisense.identity.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import org.slf4j.MDC;

/** RFC 7807 body shared by every error response. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Problem(String type, String title, int status, String detail, String instance, String traceId,
                      List<FieldError> errors) {

    public record FieldError(String field, String message) {}

    public static Problem of(int status, String slug, String title, String detail, String instance, List<FieldError> errors) {
        return new Problem("https://agrisense.local/problems/" + (slug != null ? slug : slugFor(status)),
                title, status, detail, instance, MDC.get("traceId"), errors);
    }

    static String slugFor(int status) {
        return switch (status) {
            case 400 -> "bad-request";
            case 401 -> "unauthorized";
            case 403 -> "forbidden";
            case 404 -> "not-found";
            case 405 -> "method-not-allowed";
            case 409 -> "conflict";
            case 422 -> "validation";
            case 429 -> "rate-limited";
            case 503 -> "unavailable";
            default -> status >= 500 ? "internal" : "bad-request";
        };
    }
}

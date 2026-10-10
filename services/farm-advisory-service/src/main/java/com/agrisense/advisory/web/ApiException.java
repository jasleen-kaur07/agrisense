package com.agrisense.advisory.web;

import java.util.List;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String slug;
    private final String title;
    private final List<Problem.FieldErr> errors;

    public ApiException(HttpStatus status, String slug, String title, String detail, List<Problem.FieldErr> errors) {
        super(detail);
        this.status = status;
        this.slug = slug;
        this.title = title;
        this.errors = errors;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "not-found", "Not found", what + " not found", null);
    }

    public static ApiException validation(String field, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "validation", "Validation failed",
                message, List.of(new Problem.FieldErr(field, message)));
    }

    public static ApiException unavailable(String detail) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "upstream-unavailable", "Upstream unavailable", detail, null);
    }

    public static ApiException badGateway(String detail) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "bad-gateway", "Bad gateway", detail, null);
    }

    public HttpStatus status() { return status; }
    public String slug() { return slug; }
    public String title() { return title; }
    public List<Problem.FieldErr> errors() { return errors; }
}

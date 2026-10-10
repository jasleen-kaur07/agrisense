package com.agrisense.identity.web;

public class ApiException extends RuntimeException {
    public final int status;
    public final String title;
    public final String slug;
    public final Integer retryAfterSeconds;

    public ApiException(int status, String slug, String title, String detail, Integer retryAfterSeconds) {
        super(detail);
        this.status = status;
        this.slug = slug;
        this.title = title;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public static ApiException unauthorized(String detail) { return new ApiException(401, null, "Unauthorized", detail, null); }
    public static ApiException forbidden(String detail) { return new ApiException(403, null, "Forbidden", detail, null); }
    public static ApiException badRequest(String detail) { return new ApiException(400, null, "Bad request", detail, null); }
    public static ApiException notFound(String detail) { return new ApiException(404, null, "Not found", detail, null); }
    public static ApiException conflict(String detail) { return new ApiException(409, null, "Conflict", detail, null); }
    public static ApiException tooManyRequests(int retryAfter) {
        return new ApiException(429, null, "Too many requests", "Too many attempts, try again later.", retryAfter);
    }
}

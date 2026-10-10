package com.agrisense.identity.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Object> api(ApiException e, HttpServletRequest req) {
        var headers = new HttpHeaders();
        if (e.retryAfterSeconds != null) headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(e.retryAfterSeconds));
        return respond(e.status, e.slug, e.title, e.getMessage(), req.getRequestURI(), null, headers);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Object> denied(HttpServletRequest req) {
        return respond(403, null, "Forbidden", "Access denied.", req.getRequestURI(), null, new HttpHeaders());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> unexpected(Exception e, HttpServletRequest req) {
        log.error("Unhandled error on {}", req.getRequestURI(), e);
        return respond(500, null, "Internal server error", "An unexpected error occurred.", req.getRequestURI(), null, new HttpHeaders());
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        List<Problem.FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new Problem.FieldError(f.getField(), f.getDefaultMessage()))
                .distinct().toList();
        return respond(422, null, "Validation failed", "One or more fields are invalid.", uri(request), errors, new HttpHeaders());
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode status, WebRequest request) {
        var reason = HttpStatus.resolve(status.value());
        return respond(status.value(), null, reason != null ? reason.getReasonPhrase() : "Error",
                status.is4xxClientError() ? "The request could not be processed." : "An unexpected error occurred.",
                uri(request), null, headers);
    }

    private static String uri(WebRequest r) {
        return ((ServletWebRequest) r).getRequest().getRequestURI();
    }

    private static ResponseEntity<Object> respond(int status, String slug, String title, String detail, String instance,
                                                  List<Problem.FieldError> errors, HttpHeaders extra) {
        var headers = new HttpHeaders();
        if (extra != null) headers.putAll(extra);
        headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        return new ResponseEntity<>(Problem.of(status, slug, title, detail, instance, errors), headers, status);
    }
}

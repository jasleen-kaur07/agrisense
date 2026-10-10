package com.agrisense.advisory.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ResponseEntity<Problem> respond(HttpStatus s, String slug, String title, String detail,
                                            HttpServletRequest req, List<Problem.FieldErr> errors) {
        return ResponseEntity.status(s).contentType(MediaType.parseMediaType(ProblemWriter.CONTENT_TYPE))
                .body(ProblemWriter.build(s, slug, title, detail, req.getRequestURI(), errors));
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Problem> api(ApiException e, HttpServletRequest req) {
        return respond(e.status(), e.slug(), e.title(), e.getMessage(), req, e.errors());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Problem> invalid(MethodArgumentNotValidException e, HttpServletRequest req) {
        List<Problem.FieldErr> errs = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new Problem.FieldErr(f.getField(), f.getDefaultMessage())).toList();
        return respond(HttpStatus.UNPROCESSABLE_ENTITY, "validation", "Validation failed",
                "One or more fields are invalid", req, errs);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<Problem> missing(MissingServletRequestParameterException e, HttpServletRequest req) {
        return respond(HttpStatus.UNPROCESSABLE_ENTITY, "validation", "Validation failed",
                "Missing parameter " + e.getParameterName(), req,
                List.of(new Problem.FieldErr(e.getParameterName(), "is required")));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Problem> badRequest(Exception e, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, "bad-request", "Bad request", "The request could not be parsed", req, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Problem> noResource(HttpServletRequest req) {
        return respond(HttpStatus.NOT_FOUND, "not-found", "Not found", "Resource not found", req, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<Problem> method(HttpServletRequest req) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "method-not-allowed", "Method not allowed",
                "Method not allowed", req, null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Problem> other(Exception e, HttpServletRequest req) {
        log.error("Unhandled error on {} {}: {}", req.getMethod(), req.getRequestURI(), e.getClass().getSimpleName(), e);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "internal", "Internal error",
                "An unexpected error occurred", req, null);
    }
}

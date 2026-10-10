package com.agrisense.advisory.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class ProblemWriter {
    public static final String CONTENT_TYPE = "application/problem+json";
    private final ObjectMapper mapper;

    public ProblemWriter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public static Problem build(HttpStatus status, String slug, String title, String detail, String instance,
                                List<Problem.FieldErr> errors) {
        return new Problem("https://agrisense.local/problems/" + slug, title, status.value(), detail, instance,
                MDC.get("traceId"), errors);
    }

    public void write(HttpServletRequest req, HttpServletResponse res, HttpStatus status, String slug, String title,
                      String detail) throws IOException {
        res.setStatus(status.value());
        res.setContentType(CONTENT_TYPE);
        mapper.writeValue(res.getOutputStream(), build(status, slug, title, detail, req.getRequestURI(), null));
    }
}

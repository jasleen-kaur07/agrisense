package com.agrisense.identity.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;

/** Writes problem+json from servlet filters / security handlers, where controller advice does not apply. */
@Component
public class ProblemWriter {
    private final ObjectMapper mapper;

    public ProblemWriter(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public void write(HttpServletRequest req, HttpServletResponse res, ApiException e) throws IOException {
        if (e.retryAfterSeconds != null) res.setHeader("Retry-After", String.valueOf(e.retryAfterSeconds));
        res.setStatus(e.status);
        res.setContentType("application/problem+json");
        mapper.writeValue(res.getOutputStream(),
                Problem.of(e.status, e.slug, e.title, e.getMessage(), req.getRequestURI(), null));
    }
}

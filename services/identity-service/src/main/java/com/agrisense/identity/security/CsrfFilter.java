package com.agrisense.identity.security;

import com.agrisense.identity.web.ApiException;
import com.agrisense.identity.web.CookieFactory;
import com.agrisense.identity.web.ProblemWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Defence in depth (the gateway is the primary enforcer): double-submit check only for cookie-authenticated unsafe
 * requests, i.e. no Authorization header but an as_access/as_refresh cookie present.
 */
public class CsrfFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private static final Set<String> EXEMPT = Set.of("/v1/auth/login", "/v1/auth/register", "/v1/auth/forgot", "/v1/auth/reset");

    private final ProblemWriter problems;

    public CsrfFilter(ProblemWriter problems) {
        this.problems = problems;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (!SAFE.contains(req.getMethod()) && req.getHeader("Authorization") == null && !EXEMPT.contains(req.getRequestURI())
                && (cookie(req, CookieFactory.ACCESS) != null || cookie(req, CookieFactory.REFRESH) != null)) {
            String cookie = cookie(req, CookieFactory.CSRF), header = req.getHeader("X-CSRF-Token");
            if (cookie == null || header == null || !MessageDigest.isEqual(
                    cookie.getBytes(StandardCharsets.UTF_8), header.getBytes(StandardCharsets.UTF_8))) {
                problems.write(req, res, new ApiException(403, "csrf", "Forbidden", "CSRF token missing or invalid.", null));
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private static String cookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) return null;
        for (Cookie c : req.getCookies()) {
            if (name.equals(c.getName()) && !c.getValue().isEmpty()) return c.getValue();
        }
        return null;
    }
}

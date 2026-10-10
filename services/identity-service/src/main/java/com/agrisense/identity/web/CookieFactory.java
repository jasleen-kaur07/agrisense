package com.agrisense.identity.web;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.service.Tokens;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieFactory {
    public static final String ACCESS = "as_access", REFRESH = "as_refresh", CSRF = "as_csrf";
    private static final String REFRESH_PATH = "/api/v1/auth";

    private final boolean secure;

    public CookieFactory(AppProperties props) {
        this.secure = props.cookieSecure();
    }

    public void write(HttpServletResponse res, String access, String refresh) {
        add(res, build(ACCESS, access, "/", true, Duration.ofMinutes(15)));
        add(res, build(REFRESH, refresh, REFRESH_PATH, true, Duration.ofDays(7)));
        add(res, build(CSRF, Tokens.random(), "/", false, Duration.ofDays(7)));
    }

    public void clear(HttpServletResponse res) {
        add(res, build(ACCESS, "", "/", true, Duration.ZERO));
        add(res, build(REFRESH, "", REFRESH_PATH, true, Duration.ZERO));
        add(res, build(CSRF, "", "/", false, Duration.ZERO));
    }

    private ResponseCookie build(String name, String value, String path, boolean httpOnly, Duration maxAge) {
        return ResponseCookie.from(name, value).httpOnly(httpOnly).secure(secure).sameSite("Strict")
                .path(path).maxAge(maxAge).build();
    }

    private static void add(HttpServletResponse res, ResponseCookie c) {
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }
}

package com.agrisense.identity;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.agrisense.identity.service.MailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
abstract class IntegrationTestBase {
    static final String PASSWORD = "correct-horse-battery";
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16-alpine");
    static final ListAppender<ILoggingEvent> MAIL_LOG = new ListAppender<>();
    private static final AtomicInteger IP = new AtomicInteger();

    static {
        PG.start();
        MAIL_LOG.start();
    }

    @org.junit.jupiter.api.BeforeEach
    void captureMailLog() { // Spring re-initialises logging on context start, so attach afterwards
        Logger l = (Logger) LoggerFactory.getLogger(MailService.class);
        if (!l.isAttached(MAIL_LOG)) l.addAppender(MAIL_LOG);
    }

    /** Refresh call as a browser would make it: refresh cookie plus a matching double-submit CSRF pair. */
    protected MockHttpServletRequestBuilder refreshReq(String refreshToken) throws Exception {
        return post("/v1/auth/refresh", "{}").cookie(new Cookie("as_refresh", refreshToken), new Cookie("as_csrf", "c")).header("X-CSRF-Token", "c");
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", () -> PG.getJdbcUrl() + "&currentSchema=identity");
        r.add("spring.datasource.username", PG::getUsername);
        r.add("spring.datasource.password", PG::getPassword);
        r.add("app.cookie-secure", () -> "false");
        r.add("app.mail-mode", () -> "log");
        r.add("app.admin-bootstrap-email", () -> "Admin@Agrisense.test");
        r.add("app.admin-bootstrap-password", () -> "admin-password-123");
    }

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper om;

    /** Every request gets its own client IP so rate limits only trip where a test wants them to. */
    protected static String freshIp() {
        return "10.1." + (IP.incrementAndGet() / 250) + "." + (IP.get() % 250 + 1);
    }

    protected static String uniqueEmail() {
        return "farmer-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    protected MockHttpServletRequestBuilder post(String path, Object body) throws Exception {
        return MockMvcRequestBuilders.post(path).contentType(MediaType.APPLICATION_JSON)
                .content(body instanceof String s ? s : om.writeValueAsString(body)).header("X-Forwarded-For", freshIp());
    }

    protected MvcResult register(String email) throws Exception {
        return mvc.perform(post("/v1/auth/register", java.util.Map.of("email", email, "password", PASSWORD))).andReturn();
    }

    protected MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/v1/auth/login", java.util.Map.of("email", email, "password", password))).andReturn();
    }

    protected JsonNode body(MvcResult r) throws Exception {
        return om.readTree(r.getResponse().getContentAsString());
    }

    /** Value of a Set-Cookie header by cookie name (null when absent). */
    protected static String cookie(MvcResult r, String name) {
        return setCookie(r, name) == null ? null : setCookie(r, name).split(";", 2)[0].substring(name.length() + 1);
    }

    protected static String setCookie(MvcResult r, String name) {
        return r.getResponse().getHeaders("Set-Cookie").stream().filter(h -> h.startsWith(name + "=")).findFirst().orElse(null);
    }

    protected static Cookie[] sessionCookies(MvcResult r) {
        return new Cookie[] {new Cookie("as_access", cookie(r, "as_access")), new Cookie("as_refresh", cookie(r, "as_refresh")),
                new Cookie("as_csrf", cookie(r, "as_csrf"))};
    }

    protected String lastResetToken() {
        List<ILoggingEvent> events = List.copyOf(MAIL_LOG.list);
        for (int i = events.size() - 1; i >= 0; i--) {
            Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(events.get(i).getFormattedMessage());
            if (m.find()) return m.group(1);
        }
        throw new AssertionError("no reset link logged");
    }
}

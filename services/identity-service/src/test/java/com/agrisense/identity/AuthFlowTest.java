package com.agrisense.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class AuthFlowTest extends IntegrationTestBase {

    @Test
    void registerSetsCookiesAndMeWorksViaCookieAndBearer() throws Exception {
        String email = uniqueEmail();
        MvcResult r = register(email);
        assertThat(r.getResponse().getStatus()).isEqualTo(201);
        assertThat(body(r).get("email").asText()).isEqualTo(email);
        assertThat(body(r).get("roles").get(0).asText()).isEqualTo("FARMER");
        assertThat(body(r).has("passwordHash")).isFalse();

        assertThat(setCookie(r, "as_access")).contains("HttpOnly", "SameSite=Strict", "Path=/;", "Max-Age=900");
        assertThat(setCookie(r, "as_refresh")).contains("HttpOnly", "SameSite=Strict", "Path=/api/v1/auth");
        assertThat(setCookie(r, "as_csrf")).contains("SameSite=Strict", "Path=/").doesNotContain("HttpOnly");
        assertThat(cookie(r, "as_csrf")).hasSizeGreaterThanOrEqualTo(43);

        mvc.perform(get("/v1/auth/me").cookie(new Cookie("as_access", cookie(r, "as_access"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(email)).andExpect(jsonPath("$.enabled").value(true));
        mvc.perform(get("/v1/auth/me").header("Authorization", "Bearer " + cookie(r, "as_access")))
                .andExpect(status().isOk());
        mvc.perform(get("/v1/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }

    @Test
    void emailIsCaseInsensitiveAndDuplicateGives409() throws Exception {
        String email = uniqueEmail();
        register(email);
        MvcResult dup = mvc.perform(post("/v1/auth/register", Map.of("email", email.toUpperCase(), "password", PASSWORD))).andReturn();
        assertThat(dup.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(dup).get("status").asInt()).isEqualTo(409);
    }

    @Test
    void problemJsonShapeAndRequestIdEcho() throws Exception {
        MvcResult r = mvc.perform(post("/v1/auth/register", Map.of("email", "not-an-email", "password", "short"))
                .header("X-Request-ID", "req-abc-123")).andReturn();
        assertThat(r.getResponse().getStatus()).isEqualTo(422);
        assertThat(r.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(r.getResponse().getHeader("X-Request-ID")).isEqualTo("req-abc-123");
        var p = body(r);
        assertThat(p.get("type").asText()).isEqualTo("https://agrisense.local/problems/validation");
        assertThat(p.get("title").asText()).isEqualTo("Validation failed");
        assertThat(p.get("instance").asText()).isEqualTo("/v1/auth/register");
        assertThat(p.get("traceId").asText()).isEqualTo("req-abc-123");
        assertThat(p.get("errors")).extracting(e -> e.get("field").asText()).contains("email", "password");
        assertThat(r.getResponse().getContentAsString()).doesNotContain("Exception").doesNotContain("at com.");
    }

    @Test
    void malformedBodyIs400ProblemJson() throws Exception {
        mvc.perform(post("/v1/auth/login", "{not json")).andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }

    @Test
    void loginSucceedsAndFailuresAreIndistinguishable() throws Exception {
        String email = uniqueEmail();
        register(email);
        MvcResult ok = login(email.toUpperCase(), PASSWORD);
        assertThat(ok.getResponse().getStatus()).isEqualTo(200);
        assertThat(cookie(ok, "as_refresh")).isNotBlank();

        MvcResult wrong = login(email, "wrong-password-123");
        MvcResult unknown = login(uniqueEmail(), PASSWORD);
        assertThat(wrong.getResponse().getStatus()).isEqualTo(401);
        assertThat(unknown.getResponse().getStatus()).isEqualTo(401);
        assertThat(body(wrong).get("detail").asText()).isEqualTo("Invalid credentials").isEqualTo(body(unknown).get("detail").asText());
        assertThat(setCookie(wrong, "as_access")).isNull();
    }

    @Test
    void refreshRotatesAndReuseRevokesFamily() throws Exception {
        MvcResult reg = register(uniqueEmail());
        String first = cookie(reg, "as_refresh");

        MvcResult rotated = mvc.perform(refreshReq(first)).andReturn();
        assertThat(rotated.getResponse().getStatus()).isEqualTo(204);
        String second = cookie(rotated, "as_refresh");
        assertThat(second).isNotEqualTo(first);
        mvc.perform(get("/v1/auth/me").cookie(new Cookie("as_access", cookie(rotated, "as_access")))).andExpect(status().isOk());

        // old token presented again: 401 and the whole family (including `second`) is revoked
        mvc.perform(refreshReq(first)).andExpect(status().isUnauthorized());
        mvc.perform(refreshReq(second)).andExpect(status().isUnauthorized());
        mvc.perform(post("/v1/auth/refresh", "{}")).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesFamilyAndClearsCookies() throws Exception {
        MvcResult reg = register(uniqueEmail());
        String refresh = cookie(reg, "as_refresh");
        MvcResult out = mvc.perform(post("/v1/auth/logout", "{}").cookie(sessionCookies(reg))
                .header("X-CSRF-Token", cookie(reg, "as_csrf"))).andReturn();
        assertThat(out.getResponse().getStatus()).isEqualTo(204);
        assertThat(setCookie(out, "as_refresh")).contains("Max-Age=0");
        assertThat(setCookie(out, "as_access")).contains("Max-Age=0");
        mvc.perform(refreshReq(refresh)).andExpect(status().isUnauthorized());
    }

    @Test
    void cookieAuthenticatedUnsafeRequestNeedsCsrfHeader() throws Exception {
        MvcResult reg = register(uniqueEmail());
        mvc.perform(post("/v1/auth/logout", "{}").cookie(sessionCookies(reg))).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        mvc.perform(post("/v1/auth/logout", "{}").cookie(sessionCookies(reg)).header("X-CSRF-Token", "nope"))
                .andExpect(status().isForbidden());
        // Bearer callers (the gateway) are not subject to the check
        mvc.perform(post("/v1/auth/logout", "{}").header("Authorization", "Bearer " + cookie(reg, "as_access")))
                .andExpect(status().isNoContent());
    }

    @Test
    void forgotAlwaysReturns202() throws Exception {
        String email = uniqueEmail();
        register(email);
        mvc.perform(post("/v1/auth/forgot", Map.of("email", email))).andExpect(status().isAccepted());
        mvc.perform(post("/v1/auth/forgot", Map.of("email", uniqueEmail()))).andExpect(status().isAccepted());
    }

    @Test
    void resetFlowSetsPasswordAndRevokesEverySession() throws Exception {
        String email = uniqueEmail();
        MvcResult reg = register(email);
        mvc.perform(post("/v1/auth/forgot", Map.of("email", email))).andExpect(status().isAccepted());
        String token = lastResetToken();

        mvc.perform(post("/v1/auth/reset", Map.of("token", token, "newPassword", "short"))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/v1/auth/reset", Map.of("token", token, "newPassword", "a-brand-new-password"))).andExpect(status().isNoContent());

        // reuse of the token, and garbage tokens, give the same generic 400
        mvc.perform(post("/v1/auth/reset", Map.of("token", token, "newPassword", "another-password-1"))).andExpect(status().isBadRequest());
        mvc.perform(post("/v1/auth/reset", Map.of("token", "garbage", "newPassword", "another-password-1")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Invalid or expired reset token."));

        mvc.perform(refreshReq(cookie(reg, "as_refresh"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/auth/me").header("Authorization", "Bearer " + cookie(reg, "as_access"))).andExpect(status().isUnauthorized());
        assertThat(login(email, PASSWORD).getResponse().getStatus()).isEqualTo(401);
        assertThat(login(email, "a-brand-new-password").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void loginIsRateLimitedPerEmailWithRetryAfter() throws Exception {
        String email = uniqueEmail();
        MvcResult last = null;
        for (int i = 0; i < 11; i++) last = login(email, "wrong-password-123");
        assertThat(last.getResponse().getStatus()).isEqualTo(429);
        assertThat(last.getResponse().getContentType()).startsWith("application/problem+json");
        assertThat(Integer.parseInt(last.getResponse().getHeader("Retry-After"))).isPositive();
        assertThat(body(last).get("status").asInt()).isEqualTo(429);
    }

    @Test
    void loginIsRateLimitedPerIp() throws Exception {
        MvcResult last = null;
        for (int i = 0; i < 31; i++) {
            last = mvc.perform(MockMvcRequestBuildersHelper.loginFrom("10.9.9.9", uniqueEmail())).andReturn();
        }
        assertThat(last.getResponse().getStatus()).isEqualTo(429);
    }

    /** Fixed-IP request builder (the base helpers pick a fresh IP per call). */
    static final class MockMvcRequestBuildersHelper {
        static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder loginFrom(String ip, String email) {
            return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON).header("X-Forwarded-For", ip)
                    .content("{\"email\":\"" + email + "\",\"password\":\"whatever-password\"}");
        }
    }
}

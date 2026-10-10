package com.agrisense.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class ProfileAdminTest extends IntegrationTestBase {

    private static Cookie access(MvcResult r) {
        return new Cookie("as_access", cookie(r, "as_access"));
    }

    private static String bearer(MvcResult r) {
        return "Bearer " + cookie(r, "as_access");
    }

    private MvcResult admin() throws Exception {
        MvcResult r = login("admin@agrisense.test", "admin-password-123");
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        return r;
    }

    @Test
    void profileDefaultsUpdateAndOnboarding() throws Exception {
        MvcResult reg = register(uniqueEmail());
        mvc.perform(get("/v1/profile").cookie(access(reg))).andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en")).andExpect(jsonPath("$.onboardingCompleted").value(false))
                .andExpect(jsonPath("$.experienceLevel").doesNotExist());

        mvc.perform(put("/v1/profile").cookie(access(reg)).header("X-CSRF-Token", cookie(reg, "as_csrf")).cookie(new Cookie("as_csrf", cookie(reg, "as_csrf")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Asha\",\"language\":\"hi\",\"experienceLevel\":\"BEGINNER\",\"preferredStateKey\":\"punjab\","
                                + "\"preferredDistrictKey\":\"ludhiana\",\"onboardingCompleted\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Asha")).andExpect(jsonPath("$.language").value("hi"))
                .andExpect(jsonPath("$.preferredDistrictKey").value("ludhiana")).andExpect(jsonPath("$.onboardingCompleted").value(true));

        // partial update leaves other fields untouched; /me reflects it
        mvc.perform(put("/v1/profile").header("Authorization", "Bearer " + cookie(reg, "as_access")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"Asha K\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.language").value("hi"));
        mvc.perform(get("/v1/auth/me").cookie(access(reg))).andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.displayName").value("Asha K"));
    }

    @Test
    void profileValidationAndAuth() throws Exception {
        MvcResult reg = register(uniqueEmail());
        mvc.perform(put("/v1/profile").header("Authorization", "Bearer " + cookie(reg, "as_access")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\":\"fr\",\"experienceLevel\":\"GURU\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errors.length()").value(2))
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(get("/v1/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminListRequiresAdminRole() throws Exception {
        MvcResult farmer = register(uniqueEmail());
        mvc.perform(get("/v1/admin/users").cookie(access(farmer))).andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(get("/v1/admin/users")).andExpect(status().isUnauthorized());

        String email = uniqueEmail();
        register(email);
        MvcResult admin = admin();
        mvc.perform(get("/v1/admin/users").cookie(access(admin)).param("size", "5")).andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(5)).andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalItems").isNumber()).andExpect(jsonPath("$.items[0].email").exists());
        mvc.perform(get("/v1/admin/users").cookie(access(admin)).param("q", email.substring(0, 14).toUpperCase()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.email=='" + email + "')]").exists());
    }

    @Test
    void adminCannotDisableOrDemoteSelf() throws Exception {
        MvcResult admin = admin();
        String id = body(admin).get("id").asText();
        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[\"FARMER\"]}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[\"ADMIN\"]}"))
                .andExpect(status().isOk());
        // changing roles bumped token_version, so the old token is stale: sign in again
        admin = admin();
        mvc.perform(patch("/v1/admin/users/00000000-0000-0000-0000-000000000000").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true}")).andExpect(status().isNotFound());
        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[\"ROOT\"]}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void disablingUserRevokesSessionsAndBlocksLogin() throws Exception {
        String email = uniqueEmail();
        MvcResult farmer = register(email);
        String id = body(farmer).get("id").asText();
        MvcResult admin = admin();

        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(get("/v1/auth/me").cookie(access(farmer))).andExpect(status().isUnauthorized());
        mvc.perform(refreshReq(cookie(farmer, "as_refresh"))).andExpect(status().isUnauthorized());
        assertThat(login(email, PASSWORD).getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void promotedUserNeedsFreshTokenForAdminAccess() throws Exception {
        String email = uniqueEmail();
        MvcResult farmer = register(email);
        String id = body(farmer).get("id").asText();
        mvc.perform(patch("/v1/admin/users/" + id).header("Authorization", bearer(admin())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"FARMER\",\"ADMIN\"]}")).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ADMIN")).andExpect(jsonPath("$.roles[1]").value("FARMER"));
        // old token carries stale `ver`: rejected; a new login works
        mvc.perform(get("/v1/admin/users").cookie(access(farmer))).andExpect(status().isUnauthorized());
        mvc.perform(get("/v1/admin/users").cookie(access(login(email, PASSWORD)))).andExpect(status().isOk());
    }

    @Test
    void healthAndReady() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/ready")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        assertThat(Map.of()).isEmpty();
    }
}

package com.agrisense.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

class JwksTest extends IntegrationTestBase {

    @Test
    void jwksKeyVerifiesIssuedAccessToken() throws Exception {
        MvcResult reg = register(uniqueEmail());
        String json = mvc.perform(get("/.well-known/jwks.json")).andReturn().getResponse().getContentAsString();
        JWKSet set = JWKSet.parse(json);
        assertThat(set.getKeys()).hasSize(1);
        assertThat(json).doesNotContain("\"d\"").doesNotContain("\"p\"");

        SignedJWT jwt = SignedJWT.parse(cookie(reg, "as_access"));
        RSAKey key = (RSAKey) set.getKeyByKeyId(jwt.getHeader().getKeyID());
        assertThat(key).isNotNull();
        assertThat(jwt.verify(new RSASSAVerifier(key))).isTrue();
        assertThat(jwt.getHeader().getAlgorithm().getName()).isEqualTo("RS256");

        var claims = jwt.getJWTClaimsSet();
        assertThat(claims.getIssuer()).isEqualTo("agrisense-identity");
        assertThat(claims.getSubject()).isEqualTo(body(reg).get("id").asText());
        assertThat(claims.getStringListClaim("roles")).containsExactly("FARMER");
        assertThat(claims.getJWTID()).isNotBlank();
        assertThat(claims.getIntegerClaim("ver")).isZero();
        long ttl = claims.getExpirationTime().getTime() - claims.getIssueTime().getTime();
        assertThat(ttl).isEqualTo(15 * 60 * 1000L);
        assertThat(claims.getExpirationTime()).isAfter(Date.from(Instant.now()));
    }
}

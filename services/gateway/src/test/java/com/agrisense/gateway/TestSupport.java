package com.agrisense.gateway;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.ServerSocket;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/** Shared stubs, keys and token helpers (started once per JVM). */
final class TestSupport {

    static final StubServer IDENTITY = new StubServer("identity");
    static final StubServer FARM = new StubServer("farm-advisory");
    static final StubServer DATA = new StubServer("data");
    static final StubServer JWKS = new StubServer("jwks");
    static final RSAKey KEY;
    static final RSAKey OTHER_KEY;
    static final RSAKey ROTATED_KEY;

    static {
        try {
            KEY = new RSAKeyGenerator(2048).keyID("k1").generate();
            OTHER_KEY = new RSAKeyGenerator(2048).keyID("k1").generate(); // same kid, different material
            ROTATED_KEY = new RSAKeyGenerator(2048).keyID("k2").generate();
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
        JWKS.setJwks(new JWKSet(KEY.toPublicJWK()).toString());
    }

    private TestSupport() {}

    static String jwksUrl() {
        return JWKS.url() + "/.well-known/jwks.json";
    }

    static void publishKeys(RSAKey... keys) {
        JWKS.setJwks(new JWKSet(List.of(java.util.Arrays.stream(keys).map(RSAKey::toPublicJWK)
                .toArray(com.nimbusds.jose.jwk.JWK[]::new))).toString());
    }

    static String token(RSAKey signer, String issuer, List<String> roles, Instant exp) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(issuer).subject(UUID.randomUUID().toString())
                    .claim("roles", roles).jwtID(UUID.randomUUID().toString()).claim("ver", 1)
                    .issueTime(new Date()).expirationTime(Date.from(exp)).build();
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signer.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(signer));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static String valid(String... roles) {
        return token(KEY, "agrisense-identity", List.of(roles), Instant.now().plusSeconds(600));
    }

    static int closedPort() {
        try (ServerSocket s = new ServerSocket(0)) {
            return s.getLocalPort();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

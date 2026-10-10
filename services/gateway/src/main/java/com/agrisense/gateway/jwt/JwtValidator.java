package com.agrisense.gateway.jwt;

import com.agrisense.gateway.config.GatewayProperties;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.util.Date;
import java.util.List;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/** Validates RS256 access tokens issued by identity-service. */
@Component
public class JwtValidator {

    public record Principal(String subject, List<String> roles) {}

    private static final long SKEW_MS = 5_000;
    private final JwksCache jwks;
    private final String issuer;

    public JwtValidator(JwksCache jwks, GatewayProperties props) {
        this.jwks = jwks;
        this.issuer = props.getIssuer();
    }

    /** Emits the principal, or errors with {@link JwtException}. */
    public Mono<Principal> validate(String token) {
        final SignedJWT jwt;
        try {
            jwt = SignedJWT.parse(token);
        } catch (Exception e) {
            return Mono.error(new JwtException("malformed token", false));
        }
        if (!JWSAlgorithm.RS256.equals(jwt.getHeader().getAlgorithm())) {
            return Mono.error(new JwtException("unsupported algorithm", false));
        }
        return jwks.keysFor(jwt.getHeader().getKeyID()).flatMap(keys -> {
            boolean verified = false;
            for (RSAKey key : keys) {
                try {
                    if (jwt.verify(new RSASSAVerifier(key.toRSAPublicKey()))) {
                        verified = true;
                        break;
                    }
                } catch (Exception ignored) {
                    // try next key
                }
            }
            if (!verified) {
                return Mono.error(new JwtException("bad signature", false));
            }
            try {
                JWTClaimsSet c = jwt.getJWTClaimsSet();
                if (!issuer.equals(c.getIssuer())) {
                    return Mono.error(new JwtException("bad issuer", false));
                }
                Date exp = c.getExpirationTime();
                if (exp == null || exp.getTime() + SKEW_MS < System.currentTimeMillis()) {
                    return Mono.error(new JwtException("expired", false));
                }
                Date nbf = c.getNotBeforeTime();
                if (nbf != null && nbf.getTime() - SKEW_MS > System.currentTimeMillis()) {
                    return Mono.error(new JwtException("not yet valid", false));
                }
                String sub = c.getSubject();
                if (sub == null || sub.isBlank()) {
                    return Mono.error(new JwtException("no subject", false));
                }
                List<String> roles = c.getStringListClaim("roles");
                return Mono.just(new Principal(sub, roles == null ? List.of() : roles));
            } catch (Exception e) {
                return Mono.error(new JwtException("bad claims", false));
            }
        });
    }
}

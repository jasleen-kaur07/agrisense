package com.agrisense.identity.service;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.domain.Role;
import com.agrisense.identity.domain.User;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    public static final String ISSUER = "agrisense-identity";
    public static final Duration ACCESS_TTL = Duration.ofMinutes(15);

    private final RSAKey key;
    private final NimbusJwtEncoder encoder;
    private final NimbusJwtDecoder decoder;
    private final Clock clock;

    public JwtService(AppProperties props, Clock clock) throws Exception {
        this.key = JwtKeys.load(props.jwtPrivateKeyPem());
        this.clock = clock;
        this.encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
        this.decoder = NimbusJwtDecoder.withPublicKey(key.toRSAPublicKey()).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
    }

    public String issueAccessToken(User u) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER).subject(u.id.toString()).id(UUID.randomUUID().toString())
                .issuedAt(now).expiresAt(now.plus(ACCESS_TTL))
                .claim("roles", u.roles.stream().map(Role::name).sorted().toList())
                .claim("ver", u.tokenVersion)
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.getKeyID()).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /** Signature, issuer and expiry checked; the caller still has to compare {@code ver} with the database. */
    public Optional<Jwt> parse(String token) {
        try {
            return Optional.of(decoder.decode(token));
        } catch (JwtException e) {
            return Optional.empty();
        }
    }

    public Map<String, Object> jwks() {
        return new JWKSet(key.toPublicJWK()).toJSONObject();
    }
}

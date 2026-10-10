package com.agrisense.identity.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class JwtKeys {
    private static final Logger log = LoggerFactory.getLogger(JwtKeys.class);

    private JwtKeys() {}

    /** Loads a PKCS8 PEM private key, or generates an ephemeral RSA-2048 key when {@code pem} is blank. */
    public static RSAKey load(String pem) {
        try {
            if (pem == null || pem.isBlank()) {
                log.warn("JWT_PRIVATE_KEY_PEM is not set: generated an EPHEMERAL signing key; tokens will not survive a restart");
                KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
                g.initialize(2048);
                KeyPair kp = g.generateKeyPair();
                return build((RSAPublicKey) kp.getPublic(), (RSAPrivateCrtKey) kp.getPrivate());
            }
            String b64 = pem.replace("\\n", "\n").replaceAll("-----(BEGIN|END) PRIVATE KEY-----", "").replaceAll("\\s", "");
            KeyFactory kf = KeyFactory.getInstance("RSA");
            RSAPrivateCrtKey priv = (RSAPrivateCrtKey) kf.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(b64)));
            RSAPublicKey pub = (RSAPublicKey) kf.generatePublic(new RSAPublicKeySpec(priv.getModulus(), priv.getPublicExponent()));
            return build(pub, priv);
        } catch (GeneralSecurityException | JOSEException | IllegalArgumentException | ClassCastException e) {
            throw new IllegalStateException("JWT_PRIVATE_KEY_PEM is not a valid PKCS8 RSA private key", e);
        }
    }

    private static RSAKey build(RSAPublicKey pub, RSAPrivateCrtKey priv) throws JOSEException {
        String kid = new RSAKey.Builder(pub).build().computeThumbprint().toString();
        return new RSAKey.Builder(pub).privateKey(priv).keyID(kid).keyUse(KeyUse.SIGNATURE).algorithm(JWSAlgorithm.RS256).build();
    }
}

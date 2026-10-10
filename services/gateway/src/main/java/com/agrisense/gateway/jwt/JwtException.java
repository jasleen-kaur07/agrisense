package com.agrisense.gateway.jwt;

/** Token rejected (or verification impossible). */
public class JwtException extends Exception {
    private final boolean unavailable;

    public JwtException(String message, boolean unavailable) {
        super(message, null, false, false);
        this.unavailable = unavailable;
    }

    /** True when the failure is that the signing keys cannot be obtained (maps to 503, not 401). */
    public boolean isUnavailable() {
        return unavailable;
    }
}

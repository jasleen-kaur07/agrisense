package com.agrisense.identity.web;

import jakarta.servlet.http.HttpServletRequest;

final class ClientIp {
    private ClientIp() {}

    /**
     * The service is only reachable through the gateway, which strips any client-supplied X-Client-IP and sets it
     * from its own view of the caller. Fall back to the last X-Forwarded-For hop / socket address for direct calls.
     */
    static String of(HttpServletRequest req) {
        String trusted = req.getHeader("X-Client-IP");
        if (trusted != null && !trusted.isBlank() && trusted.length() <= 45) {
            return trusted.trim();
        }
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            return parts[parts.length - 1].trim();
        }
        return req.getRemoteAddr();
    }
}

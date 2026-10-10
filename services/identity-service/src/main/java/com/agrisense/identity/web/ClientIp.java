package com.agrisense.identity.web;

import jakarta.servlet.http.HttpServletRequest;

final class ClientIp {
    private ClientIp() {}

    /** The service sits behind the gateway, which appends the peer address: trust the last X-Forwarded-For hop. */
    static String of(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            return parts[parts.length - 1].trim();
        }
        return req.getRemoteAddr();
    }
}

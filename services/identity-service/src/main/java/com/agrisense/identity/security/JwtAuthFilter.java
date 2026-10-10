package com.agrisense.identity.security;

import com.agrisense.identity.domain.UserRepository;
import com.agrisense.identity.service.JwtService;
import com.agrisense.identity.web.CookieFactory;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates from "Authorization: Bearer" (gateway) or, when that header is absent, the as_access cookie.
 * Besides the signature, the token's {@code ver} must equal the user's current token_version and the user must be enabled.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = extract(req);
        if (token != null) {
            jwt.parse(token).flatMap(j -> {
                try {
                    UUID id = UUID.fromString(j.getSubject());
                    Long ver = j.getClaim("ver") instanceof Number n ? n.longValue() : null;
                    List<String> roles = j.getClaimAsStringList("roles");
                    return users.findById(id)
                            .filter(u -> u.enabled && ver != null && u.tokenVersion == ver && roles != null)
                            .map(u -> new AuthUser(id, roles));
                } catch (IllegalArgumentException e) {
                    return java.util.Optional.<AuthUser>empty();
                }
            }).ifPresent(a -> SecurityContextHolder.getContext().setAuthentication(
                    UsernamePasswordAuthenticationToken.authenticated(a, null,
                            a.roles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList())));
        }
        chain.doFilter(req, res);
    }

    private static String extract(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        if (h != null) return h.regionMatches(true, 0, "Bearer ", 0, 7) ? h.substring(7).trim() : null;
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (CookieFactory.ACCESS.equals(c.getName()) && !c.getValue().isEmpty()) return c.getValue();
            }
        }
        return null;
    }
}

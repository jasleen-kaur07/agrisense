package com.agrisense.identity.web;

import com.agrisense.identity.security.AuthUser;
import com.agrisense.identity.service.AuthService;
import com.agrisense.identity.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final CookieFactory cookies;

    public AuthController(AuthService auth, CookieFactory cookies) {
        this.auth = auth;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest r, HttpServletRequest req, HttpServletResponse res) {
        return session(HttpStatus.CREATED, auth.register(r, ClientIp.of(req)), res);
    }

    @PostMapping("/login")
    ResponseEntity<UserDto> login(@Valid @RequestBody LoginRequest r, HttpServletRequest req, HttpServletResponse res) {
        return session(HttpStatus.OK, auth.login(r, ClientIp.of(req)), res);
    }

    @PostMapping("/refresh")
    ResponseEntity<Void> refresh(@CookieValue(name = CookieFactory.REFRESH, required = false) String refreshToken, HttpServletResponse res) {
        if (refreshToken == null || refreshToken.isBlank()) throw ApiException.unauthorized("Invalid or expired session.");
        var s = auth.refresh(refreshToken);
        cookies.write(res, s.accessToken(), s.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name = CookieFactory.REFRESH, required = false) String refreshToken, HttpServletResponse res) {
        auth.logout(refreshToken);
        cookies.clear(res);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot")
    ResponseEntity<Void> forgot(@Valid @RequestBody ForgotRequest r, HttpServletRequest req) {
        auth.forgot(r.email(), ClientIp.of(req));
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset")
    ResponseEntity<Void> reset(@Valid @RequestBody ResetRequest r) {
        auth.reset(r.token(), r.newPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    UserDto me(@AuthenticationPrincipal AuthUser principal) {
        return UserDto.from(auth.currentUser(principal.id()));
    }

    private ResponseEntity<UserDto> session(HttpStatus status, AuthService.Session s, HttpServletResponse res) {
        cookies.write(res, s.accessToken(), s.refreshToken());
        return ResponseEntity.status(status).body(UserDto.from(s.user()));
    }
}

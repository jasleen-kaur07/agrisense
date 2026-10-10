package com.agrisense.identity.web;

import com.agrisense.identity.security.AuthUser;
import com.agrisense.identity.service.AuthService;
import com.agrisense.identity.service.UserService;
import com.agrisense.identity.web.Dtos.ProfileDto;
import com.agrisense.identity.web.Dtos.ProfileUpdate;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/profile")
public class ProfileController {
    private final AuthService auth;
    private final UserService users;

    public ProfileController(AuthService auth, UserService users) {
        this.auth = auth;
        this.users = users;
    }

    @GetMapping
    ProfileDto get(@AuthenticationPrincipal AuthUser p) {
        return ProfileDto.from(auth.currentUser(p.id()));
    }

    @PutMapping
    ProfileDto put(@AuthenticationPrincipal AuthUser p, @Valid @RequestBody ProfileUpdate body) {
        return ProfileDto.from(users.updateProfile(p.id(), body));
    }
}

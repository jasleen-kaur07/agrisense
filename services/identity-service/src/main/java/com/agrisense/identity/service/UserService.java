package com.agrisense.identity.service;

import com.agrisense.identity.domain.*;
import com.agrisense.identity.web.ApiException;
import com.agrisense.identity.web.Dtos.AdminPatch;
import com.agrisense.identity.web.Dtos.ProfileUpdate;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository users;
    private final RefreshTokenService refresh;

    public UserService(UserRepository users, RefreshTokenService refresh) {
        this.users = users;
        this.refresh = refresh;
    }

    @Transactional
    public User updateProfile(UUID id, ProfileUpdate p) {
        User u = users.findById(id).orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
        if (p.displayName() != null) u.displayName = p.displayName().isBlank() ? null : p.displayName().trim();
        if (p.language() != null) u.language = p.language();
        if (p.experienceLevel() != null) u.experienceLevel = p.experienceLevel();
        if (p.preferredStateKey() != null) u.preferredStateKey = p.preferredStateKey().isBlank() ? null : p.preferredStateKey().trim();
        if (p.preferredDistrictKey() != null) u.preferredDistrictKey = p.preferredDistrictKey().isBlank() ? null : p.preferredDistrictKey().trim();
        if (p.onboardingCompleted() != null) u.onboardingCompleted = p.onboardingCompleted();
        return u;
    }

    @Transactional(readOnly = true)
    public Page<User> list(int page, int size, String q) {
        var pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by("createdAt", "id"));
        if (q == null || q.isBlank()) return users.findAll(pageable);
        String escaped = q.trim().toLowerCase().replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return users.search("%" + escaped + "%", pageable);
    }

    /** Disabling or changing roles bumps token_version so outstanding access tokens stop working; disabling also revokes sessions. */
    @Transactional
    public User adminUpdate(UUID actorId, UUID id, AdminPatch p) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        boolean self = id.equals(actorId);
        Set<Role> roles = p.roles() == null ? null : p.roles().stream().map(Role::valueOf).collect(Collectors.toSet());
        if (self && Boolean.FALSE.equals(p.enabled())) throw ApiException.forbidden("You cannot disable your own account.");
        if (self && roles != null && !roles.contains(Role.ADMIN)) throw ApiException.forbidden("You cannot remove your own ADMIN role.");
        boolean bump = false;
        boolean disabling = false;
        if (p.enabled() != null && p.enabled() != u.enabled) {
            u.enabled = p.enabled();
            disabling = !u.enabled;
            bump |= disabling;
        }
        if (roles != null && !roles.equals(u.roles)) {
            u.roles.clear();
            u.roles.addAll(roles);
            bump = true;
        }
        if (bump) u.tokenVersion++;
        if (disabling) refresh.revokeAll(u.id);
        return u;
    }
}

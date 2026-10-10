package com.agrisense.identity.web;

import com.agrisense.identity.domain.Role;
import com.agrisense.identity.domain.User;
import com.agrisense.identity.service.ValidPassword;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class Dtos {
    private Dtos() {}

    public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email,
                                  @NotNull @ValidPassword String password,
                                  @Size(max = 80) String displayName,
                                  @Pattern(regexp = "en|hi", message = "must be en or hi") String language) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record ForgotRequest(@NotBlank @Email @Size(max = 254) String email) {}

    public record ResetRequest(@NotBlank String token, @NotNull @ValidPassword String newPassword) {}

    public record UserDto(UUID id, String email, String displayName, List<String> roles, String language,
                          boolean onboardingCompleted, boolean enabled, Instant createdAt) {
        public static UserDto from(User u) {
            return new UserDto(u.id, u.email, u.displayName, u.roles.stream().map(Role::name).sorted().toList(),
                    u.language, u.onboardingCompleted, u.enabled, u.createdAt);
        }
    }

    public record ProfileDto(String displayName, String language, String experienceLevel, String preferredStateKey,
                             String preferredDistrictKey, boolean onboardingCompleted) {
        public static ProfileDto from(User u) {
            return new ProfileDto(u.displayName, u.language, u.experienceLevel, u.preferredStateKey,
                    u.preferredDistrictKey, u.onboardingCompleted);
        }
    }

    /** Absent (null) fields are left unchanged. */
    public record ProfileUpdate(@Size(max = 80) String displayName,
                                @Pattern(regexp = "en|hi", message = "must be en or hi") String language,
                                @Pattern(regexp = "BEGINNER|INTERMEDIATE|EXPERIENCED", message = "must be BEGINNER, INTERMEDIATE or EXPERIENCED") String experienceLevel,
                                @Size(max = 100) String preferredStateKey,
                                @Size(max = 100) String preferredDistrictKey,
                                Boolean onboardingCompleted) {}

    public record AdminPatch(Boolean enabled,
                             @Size(min = 1, message = "must not be empty") Set<@Pattern(regexp = "FARMER|ADMIN", message = "must be FARMER or ADMIN") String> roles) {}

    public record PageDto<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}
}

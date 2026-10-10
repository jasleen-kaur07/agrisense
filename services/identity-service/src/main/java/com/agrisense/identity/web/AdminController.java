package com.agrisense.identity.web;

import com.agrisense.identity.security.AuthUser;
import com.agrisense.identity.service.UserService;
import com.agrisense.identity.web.Dtos.*;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/admin/users")
public class AdminController {
    private final UserService users;

    public AdminController(UserService users) {
        this.users = users;
    }

    @GetMapping
    PageDto<UserDto> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                          @RequestParam(required = false) String q) {
        var p = users.list(page, size, q);
        return new PageDto<>(p.getContent().stream().map(UserDto::from).toList(), p.getNumber(), p.getSize(),
                p.getTotalElements(), p.getTotalPages());
    }

    @PatchMapping("/{id}")
    UserDto patch(@AuthenticationPrincipal AuthUser actor, @PathVariable UUID id, @Valid @RequestBody AdminPatch body) {
        return UserDto.from(users.adminUpdate(actor.id(), id, body));
    }
}

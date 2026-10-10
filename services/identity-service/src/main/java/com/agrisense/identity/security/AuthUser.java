package com.agrisense.identity.security;

import java.util.List;
import java.util.UUID;

public record AuthUser(UUID id, List<String> roles) {}

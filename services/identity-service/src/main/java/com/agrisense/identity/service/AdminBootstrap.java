package com.agrisense.identity.service;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.domain.Role;
import com.agrisense.identity.domain.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Dev convenience: creates an admin from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD when no such user exists. */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppProperties props;
    private final UserRepository users;
    private final AuthService auth;

    public AdminBootstrap(AppProperties props, UserRepository users, AuthService auth) {
        this.props = props;
        this.users = users;
        this.auth = auth;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = props.adminBootstrapEmail(), password = props.adminBootstrapPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) return;
        email = AuthService.normalize(email);
        if (users.existsByEmail(email)) return;
        if (!PasswordPolicy.isValid(password)) {
            log.warn("ADMIN_BOOTSTRAP_PASSWORD violates the password policy; bootstrap admin not created");
            return;
        }
        var admin = auth.newUser(email, password, "Administrator", "en", Role.ADMIN, Role.FARMER);
        admin.onboardingCompleted = true;
        users.save(admin);
        log.info("Bootstrap admin created: {}", MailService.mask(email));
    }
}

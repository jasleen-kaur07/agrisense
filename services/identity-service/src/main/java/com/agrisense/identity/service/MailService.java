package com.agrisense.identity.service;

import com.agrisense.identity.config.AppProperties;
import com.agrisense.identity.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final String mode;

    public MailService(AppProperties props) {
        this.mode = props.mailMode();
    }

    /**
     * DEV ONLY: with MAIL_MODE=log the full reset link (which contains the secret token) is printed at INFO so a
     * developer can click it. In every other mode nothing containing the token is ever logged; no SMTP transport exists yet.
     */
    public void sendPasswordReset(User user, String token) {
        if ("log".equalsIgnoreCase(mode)) {
            log.info("[MAIL_MODE=log] Password reset link for userId={}: http://localhost:3000/reset-password?token={}", user.id, token);
        } else {
            log.debug("Password reset requested for userId={}; MAIL_MODE={} has no mail transport", user.id, mode);
        }
    }

    public static String mask(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        return at <= 0 ? "***" : email.charAt(0) + "***" + email.substring(at);
    }
}

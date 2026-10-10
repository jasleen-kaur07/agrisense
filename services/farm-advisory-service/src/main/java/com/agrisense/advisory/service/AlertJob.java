package com.agrisense.advisory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "advisory.alerts.enabled", havingValue = "true", matchIfMissing = true)
public class AlertJob {
    private static final Logger log = LoggerFactory.getLogger(AlertJob.class);
    private final AlertService service;

    public AlertJob(AlertService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${advisory.alerts.interval-ms:3600000}",
            initialDelayString = "${advisory.alerts.initial-delay-ms:60000}")
    public void run() {
        try {
            service.runOnce();
        } catch (RuntimeException e) {
            log.error("alert job failed: {}", e.getClass().getSimpleName());
        }
    }
}

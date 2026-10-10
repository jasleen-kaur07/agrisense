package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.AlertView;
import com.agrisense.advisory.client.DataClient;
import com.agrisense.advisory.config.AppProps;
import com.agrisense.advisory.domain.Alert;
import com.agrisense.advisory.domain.Farm;
import com.agrisense.advisory.domain.Repos.AlertRepo;
import com.agrisense.advisory.domain.Repos.FarmRepo;
import com.agrisense.advisory.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AlertService {
    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepo alerts;
    private final FarmRepo farms;
    private final DataClient data;
    private final JdbcTemplate jdbc;
    private final AppProps props;

    public AlertService(AlertRepo alerts, FarmRepo farms, DataClient data, JdbcTemplate jdbc, AppProps props) {
        this.alerts = alerts;
        this.farms = farms;
        this.data = data;
        this.jdbc = jdbc;
        this.props = props;
    }

    static AlertView view(Alert a) {
        return new AlertView(a.id, a.type, a.severity, a.title, a.message, a.fieldId, a.farmId, a.source, a.createdAt,
                a.readAt != null);
    }

    public List<AlertView> list(UUID owner, boolean unreadOnly) {
        return (unreadOnly ? alerts.findByOwnerIdAndReadAtIsNullOrderByCreatedAtDesc(owner)
                : alerts.findByOwnerIdOrderByCreatedAtDesc(owner)).stream().map(AlertService::view).toList();
    }

    public void markRead(UUID owner, UUID id) {
        Alert a = alerts.findByIdAndOwnerId(id, owner).orElseThrow(() -> ApiException.notFound("Alert"));
        if (a.readAt == null) {
            a.readAt = Instant.now();
            alerts.save(a);
        }
    }

    /** One bounded pass over farms; returns the number of alerts newly created. */
    public int runOnce() {
        String prior = MDC.get("traceId");
        if (prior == null) {
            MDC.put("traceId", UUID.randomUUID().toString());
        }
        try {
            int created = 0;
            List<Farm> batch = farms.findAll(PageRequest.of(0, Math.max(1, props.alerts().maxFarmsPerRun()),
                    Sort.by("createdAt").and(Sort.by("id")))).getContent();
            Map<String, JsonNode> weatherByDistrict = new HashMap<>();
            for (Farm f : batch) {
                String dk = f.stateKey + "|" + f.districtKey;
                JsonNode w = weatherByDistrict.get(dk);
                if (w == null && !weatherByDistrict.containsKey(dk)) {
                    try {
                        w = data.weather(f.stateKey, f.districtKey);
                    } catch (RuntimeException e) {
                        log.warn("alert job: weather unavailable for a district: {}", e.getClass().getSimpleName());
                    }
                    weatherByDistrict.put(dk, w);
                }
                if (w == null) {
                    continue;
                }
                String status = w.path("status").asText();
                for (AlertRules.Trigger t : AlertRules.evaluate(w)) {
                    if (insert(f, t, status)) {
                        created++;
                    }
                }
            }
            log.info("alert job finished: farms={} created={}", batch.size(), created);
            return created;
        } finally {
            if (prior == null) {
                MDC.remove("traceId");
            }
        }
    }

    private boolean insert(Farm f, AlertRules.Trigger t, String status) {
        boolean rain = "HEAVY_RAIN".equals(t.type());
        String source = "Open-Meteo forecast (status " + status + ")";
        String title = (rain ? "Heavy rain forecast for " : "High temperature forecast for ") + f.name;
        String peak = String.format(Locale.ROOT, "%.1f", t.peak());
        String message = rain
                ? "The forecast shows up to " + peak + " mm of precipitation on " + t.peakDate()
                  + " (threshold " + AlertRules.RAIN_MM + " mm per day; days at or above: " + String.join(", ", t.days())
                  + "). Source: " + source + ". This is a forecast watch, not advice."
                : "The forecast shows a daily maximum of " + peak + " C on " + t.peakDate()
                  + " (threshold " + AlertRules.TEMP_C + " C; days at or above: " + String.join(", ", t.days())
                  + "). Source: " + source + ". This is a forecast watch, not advice.";
        String dedupe = t.type() + ":farm:" + f.id + ":" + t.windowKey();
        int n = jdbc.update("insert into alerts (id, owner_id, field_id, farm_id, type, severity, title, message, source, "
                + "dedupe_key, created_at) values (?, ?, null, ?, ?, 'WATCH', ?, ?, ?, ?, ?) "
                + "on conflict (owner_id, dedupe_key) do nothing",
                UUID.randomUUID(), f.ownerId, f.id, t.type(), title, message, source, dedupe,
                java.sql.Timestamp.from(Instant.now()));
        return n > 0;
    }
}

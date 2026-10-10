package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.*;
import com.agrisense.advisory.client.DataClient;
import com.agrisense.advisory.client.DataClient.DataClientException;
import com.agrisense.advisory.client.DataClient.DataUnavailableException;
import com.agrisense.advisory.domain.Field;
import com.agrisense.advisory.domain.Recommendation;
import com.agrisense.advisory.domain.Repos.RecRepo;
import com.agrisense.advisory.web.ApiException;
import com.agrisense.advisory.web.PageResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class RecommendationService {
    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);
    public static final String LIM_HISTORICAL = "Shows historical crop prevalence in your district, not whether a crop suits your field.";
    public static final String LIM_SOIL = "Soil values were not used.";
    private static final Set<String> SEASONS = Set.of("KHARIF", "RABI", "SUMMER");

    public record Result(RecommendationView view, boolean created) {}

    private final RecRepo recs;
    private final FieldService fields;
    private final DataClient data;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ObjectMapper mapper;

    public RecommendationService(RecRepo recs, FieldService fields, DataClient data, JdbcTemplate jdbc,
                                 TransactionTemplate tx, ObjectMapper mapper) {
        this.recs = recs;
        this.fields = fields;
        this.data = data;
        this.jdbc = jdbc;
        this.tx = tx;
        this.mapper = mapper;
    }

    public RecommendationView view(Recommendation r, boolean admin) {
        return new RecommendationView(r.id, admin ? r.ownerId : null, r.fieldId, r.fieldName, r.kind, r.season,
                new Location(r.state, r.district, r.stateKey, r.districtKey), r.regionalJson, r.weatherJson, false,
                r.dataVersionsJson, r.limitations, r.createdAt);
    }

    private Optional<UUID> existingForKey(UUID owner, UUID key) {
        List<UUID> ids = jdbc.query("select recommendation_id from idempotency_keys where owner_id = ? and key = ?",
                (rs, i) -> rs.getObject(1, UUID.class), owner, key);
        return ids.stream().findFirst();
    }

    public static UUID parseKey(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("Idempotency-Key", "must be a UUID");
        }
    }

    public Result create(UUID owner, RecommendationCreate req, String idemHeader) {
        UUID key = parseKey(idemHeader);
        if (req.mode() != null && !"REGIONAL".equals(req.mode())) {
            throw ApiException.validation("mode", "mode " + req.mode() + " is not available");
        }
        String season = null;
        if (req.season() != null) {
            season = req.season().toUpperCase(Locale.ROOT);
            if (!SEASONS.contains(season)) {
                throw ApiException.validation("season", "must be one of KHARIF, RABI, SUMMER");
            }
        }
        if (key != null) {
            Optional<UUID> prior = existingForKey(owner, key);
            if (prior.isPresent()) {
                Optional<Recommendation> r = recs.findByIdAndOwnerId(prior.get(), owner);
                if (r.isPresent()) {
                    return new Result(view(r.get(), false), false);
                }
            }
        }
        Field field = fields.owned(owner, req.fieldId());
        String stateKey, districtKey, state, district;
        {
            var farm = farmFor(owner, field);
            stateKey = farm.stateKey();
            districtKey = farm.districtKey();
            state = farm.state();
            district = farm.district();
        }

        try {
            if (season == null) {
                season = data.currentSeason().path("season").asText(null);
                if (season == null || !SEASONS.contains(season)) {
                    throw ApiException.badGateway("The data service returned an unusable season");
                }
            }
            JsonNode guide;
            try {
                guide = data.guide(stateKey, districtKey, season);
            } catch (DataClientException e) {
                throw ApiException.badGateway("The regional crop guide is not available for this district and season");
            }
            JsonNode weather = fetchWeather(stateKey, districtKey);

            Recommendation r = new Recommendation();
            r.id = UUID.randomUUID();
            r.ownerId = owner;
            r.fieldId = field.id;
            r.fieldName = field.name;
            r.kind = "REGIONAL_PATTERN";
            r.season = season;
            r.stateKey = stateKey;
            r.districtKey = districtKey;
            r.state = state;
            r.district = district;
            r.regionalJson = guide;
            r.weatherJson = weather;
            r.dataVersionsJson = dataVersions(guide);
            r.limitations = limitations(guide);
            r.createdAt = Instant.now();

            final UUID k = key;
            UUID winner = tx.execute(s -> {
                recs.saveAndFlush(r);
                if (k != null) {
                    int n = jdbc.update("insert into idempotency_keys (owner_id, key, recommendation_id, created_at) "
                            + "values (?, ?, ?, ?) on conflict do nothing", owner, k, r.id,
                            java.sql.Timestamp.from(r.createdAt));
                    if (n == 0) {
                        s.setRollbackOnly();
                        return existingForKey(owner, k).orElse(r.id);
                    }
                }
                return r.id;
            });
            if (!r.id.equals(winner)) {
                return new Result(view(recs.findByIdAndOwnerId(winner, owner).orElseThrow(), false), false);
            }
            return new Result(view(r, false), true);
        } catch (DataUnavailableException e) {
            throw e.toApi();
        }
    }

    private FarmView farmFor(UUID owner, Field field) {
        return farmService.get(owner, field.farmId);
    }

    private FarmService farmService;

    @org.springframework.beans.factory.annotation.Autowired
    void setFarmService(FarmService fs) {
        this.farmService = fs;
    }

    private JsonNode fetchWeather(String stateKey, String districtKey) {
        try {
            JsonNode w = data.weather(stateKey, districtKey);
            if (w.isObject() && w.hasNonNull("status")) {
                return w;
            }
        } catch (RuntimeException e) {
            log.warn("weather unavailable for recommendation: {}", e.getClass().getSimpleName());
        }
        ObjectNode n = mapper.createObjectNode();
        n.put("status", "UNAVAILABLE");
        n.put("source", "Open-Meteo");
        n.put("attribution", "Weather data by Open-Meteo.com");
        n.put("message", "Weather is temporarily unavailable.");
        return n;
    }

    private JsonNode dataVersions(JsonNode guide) {
        ObjectNode n = mapper.createObjectNode();
        JsonNode last = guide.path("coverage").path("lastYear");
        if (last.isNumber()) {
            n.put("regionalStatsLastYear", last.asInt());
        } else if (guide.path("asOfYear").isNumber()) {
            n.put("regionalStatsLastYear", guide.path("asOfYear").asInt());
        }
        ObjectNode cfg = n.putObject("engineConfig");
        cfg.put("mode", "REGIONAL");
        cfg.put("soilUsed", false);
        if (guide.hasNonNull("basis")) {
            cfg.put("basis", guide.get("basis").asText());
        }
        return n;
    }

    private JsonNode limitations(JsonNode guide) {
        Set<String> all = new LinkedHashSet<>();
        all.add(LIM_HISTORICAL);
        all.add(LIM_SOIL);
        for (JsonNode c : guide.path("caveats")) {
            if (c.isTextual() && !c.asText().isBlank()) {
                all.add(c.asText());
            }
        }
        ArrayNode a = mapper.createArrayNode();
        all.forEach(a::add);
        return a;
    }

    private static PageRequest page(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
    }

    public PageResponse<RecommendationView> history(UUID owner, UUID fieldId, int page, int size) {
        Page<Recommendation> p = fieldId == null ? recs.findByOwnerId(owner, page(page, size))
                : recs.findByOwnerIdAndFieldId(owner, fieldId, page(page, size));
        return PageResponse.of(p, r -> view(r, false));
    }

    public PageResponse<RecommendationView> adminAll(int page, int size) {
        return PageResponse.of(recs.findAll(page(page, size)), r -> view(r, true));
    }

    public Recommendation owned(UUID owner, UUID id) {
        return recs.findByIdAndOwnerId(id, owner).orElseThrow(() -> ApiException.notFound("Recommendation"));
    }

    public RecommendationView get(UUID owner, UUID id) {
        return view(owned(owner, id), false);
    }

    public void delete(UUID owner, UUID id) {
        if (recs.deleteOwned(id, owner) == 0) {
            throw ApiException.notFound("Recommendation");
        }
    }

    public Comparison compare(UUID owner, UUID id, String cropsParam) {
        Recommendation r = owned(owner, id);
        List<String> requested = new ArrayList<>();
        if (cropsParam != null) {
            for (String c : cropsParam.split(",")) {
                if (!c.isBlank()) {
                    requested.add(c.trim());
                }
            }
        }
        if (requested.size() < 2 || requested.size() > 4) {
            throw ApiException.validation("crops", "provide between 2 and 4 crop names");
        }
        List<String> canonical = new ArrayList<>();
        for (String c : requested) {
            String canon = CompareBuilder.canonical(r.regionalJson, c);
            if (canon == null) {
                throw ApiException.validation("crops", "crop '" + c + "' is not in this recommendation");
            }
            if (!canonical.contains(canon)) {
                canonical.add(canon);
            }
        }
        if (canonical.size() < 2) {
            throw ApiException.validation("crops", "provide between 2 and 4 different crop names");
        }
        JsonNode history = null;
        try {
            history = data.cropHistory(r.stateKey, r.districtKey, String.join(",", canonical));
        } catch (RuntimeException e) {
            log.warn("crop history unavailable for comparison: {}", e.getClass().getSimpleName());
        }
        return CompareBuilder.build(r.regionalJson, canonical, history);
    }

    public ActionPlan plan(UUID owner, UUID id, String crop) {
        Recommendation r = owned(owner, id);
        String canon = CompareBuilder.canonical(r.regionalJson, crop == null ? "" : crop.trim());
        if (canon == null) {
            throw ApiException.validation("crop", "crop '" + crop + "' is not in this recommendation");
        }
        return PlanBuilder.build(canon, r.regionalJson, r.weatherJson);
    }
}

package com.agrisense.advisory.api;

import com.agrisense.advisory.api.Dto.*;
import com.agrisense.advisory.domain.Feedback;
import com.agrisense.advisory.domain.Repos.*;
import com.agrisense.advisory.service.*;
import com.agrisense.advisory.web.Auth;
import com.agrisense.advisory.web.PageResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

public final class Controllers {
    private Controllers() {}

    @RestController
    @RequestMapping("/v1/farms")
    public static class FarmController {
        private final FarmService farms;
        private final FieldService fields;

        public FarmController(FarmService farms, FieldService fields) {
            this.farms = farms;
            this.fields = fields;
        }

        @GetMapping List<FarmView> list(@AuthenticationPrincipal Jwt jwt) { return farms.list(Auth.userId(jwt)); }

        @PostMapping ResponseEntity<FarmView> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody FarmCreate req) {
            return ResponseEntity.status(HttpStatus.CREATED).body(farms.create(Auth.userId(jwt), req));
        }

        @GetMapping("/{id}") FarmView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            return farms.get(Auth.userId(jwt), id);
        }

        @PutMapping("/{id}") FarmView update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                             @Valid @RequestBody FarmCreate req) {
            return farms.update(Auth.userId(jwt), id, req);
        }

        @DeleteMapping("/{id}") ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            farms.delete(Auth.userId(jwt), id);
            return ResponseEntity.noContent().build();
        }

        @GetMapping("/{id}/fields") List<FieldView> fieldsOf(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            return fields.listForFarm(Auth.userId(jwt), id);
        }

        @PostMapping("/{id}/fields") ResponseEntity<FieldView> addField(@AuthenticationPrincipal Jwt jwt,
                @PathVariable UUID id, @Valid @RequestBody FieldWrite req) {
            return ResponseEntity.status(HttpStatus.CREATED).body(fields.create(Auth.userId(jwt), id, req));
        }
    }

    @RestController
    @RequestMapping("/v1/fields")
    public static class FieldController {
        private final FieldService fields;

        public FieldController(FieldService fields) { this.fields = fields; }

        @GetMapping List<FieldView> all(@AuthenticationPrincipal Jwt jwt) { return fields.listAll(Auth.userId(jwt)); }

        @GetMapping("/{id}") FieldView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            return fields.get(Auth.userId(jwt), id);
        }

        @PutMapping("/{id}") FieldView update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                              @Valid @RequestBody FieldWrite req) {
            return fields.update(Auth.userId(jwt), id, req);
        }

        @DeleteMapping("/{id}") ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            fields.delete(Auth.userId(jwt), id);
            return ResponseEntity.noContent().build();
        }

        @PutMapping("/{id}/soil") FieldView putSoil(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                    @Valid @RequestBody SoilRecord soil) {
            return fields.putSoil(Auth.userId(jwt), id, soil);
        }

        @DeleteMapping("/{id}/soil") ResponseEntity<Void> deleteSoil(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            fields.deleteSoil(Auth.userId(jwt), id);
            return ResponseEntity.noContent().build();
        }
    }

    @RestController
    @RequestMapping("/v1/recommendations")
    public static class RecommendationController {
        private final RecommendationService recs;

        public RecommendationController(RecommendationService recs) { this.recs = recs; }

        @PostMapping ResponseEntity<RecommendationView> create(@AuthenticationPrincipal Jwt jwt,
                @RequestHeader(value = "Idempotency-Key", required = false) String key,
                @Valid @RequestBody RecommendationCreate req) {
            var r = recs.create(Auth.userId(jwt), req, key);
            return ResponseEntity.status(r.created() ? HttpStatus.CREATED : HttpStatus.OK).body(r.view());
        }

        @GetMapping PageResponse<RecommendationView> history(@AuthenticationPrincipal Jwt jwt,
                @RequestParam(required = false) UUID fieldId, @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "20") int size) {
            return recs.history(Auth.userId(jwt), fieldId, page, size);
        }

        @GetMapping("/{id}") RecommendationView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            return recs.get(Auth.userId(jwt), id);
        }

        @DeleteMapping("/{id}") ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            recs.delete(Auth.userId(jwt), id);
            return ResponseEntity.noContent().build();
        }

        @GetMapping("/{id}/compare") Comparison compare(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                @RequestParam String crops) {
            return recs.compare(Auth.userId(jwt), id, crops);
        }

        @PostMapping("/{id}/plan") ActionPlan plan(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                @Valid @RequestBody PlanRequest req) {
            return recs.plan(Auth.userId(jwt), id, req.crop());
        }
    }

    @RestController
    @RequestMapping("/v1/alerts")
    public static class AlertController {
        private final AlertService alerts;

        public AlertController(AlertService alerts) { this.alerts = alerts; }

        @GetMapping List<AlertView> list(@AuthenticationPrincipal Jwt jwt,
                @RequestParam(defaultValue = "false") boolean unreadOnly) {
            return alerts.list(Auth.userId(jwt), unreadOnly);
        }

        @PostMapping("/{id}/read") ResponseEntity<Void> read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
            alerts.markRead(Auth.userId(jwt), id);
            return ResponseEntity.noContent().build();
        }
    }

    @RestController
    public static class FeedbackController {
        private final FeedbackRepo feedback;
        private final FarmRepo farms;
        private final FieldRepo fields;
        private final RecRepo recs;
        private final RecommendationService recService;

        public FeedbackController(FeedbackRepo feedback, FarmRepo farms, FieldRepo fields, RecRepo recs,
                                  RecommendationService recService) {
            this.feedback = feedback;
            this.farms = farms;
            this.fields = fields;
            this.recs = recs;
            this.recService = recService;
        }

        @PostMapping("/v1/feedback") ResponseEntity<Map<String, Object>> create(@AuthenticationPrincipal Jwt jwt,
                @Valid @RequestBody FeedbackCreate req) {
            Feedback f = new Feedback();
            f.id = UUID.randomUUID();
            f.ownerId = Auth.userId(jwt);
            f.category = req.category();
            f.message = req.message();
            f.rating = req.rating();
            f.createdAt = Instant.now();
            feedback.save(f);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", f.id, "createdAt", f.createdAt));
        }

        @GetMapping("/v1/admin/feedback") PageResponse<FeedbackView> adminFeedback(
                @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
            var p = feedback.findAll(PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                    Sort.by(Sort.Direction.DESC, "createdAt")));
            return PageResponse.of(p, f -> new FeedbackView(f.id, f.ownerId, f.category, f.message, f.rating, f.createdAt));
        }

        @GetMapping("/v1/admin/recommendations") PageResponse<RecommendationView> adminRecs(
                @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
            return recService.adminAll(page, size);
        }

        @GetMapping("/v1/admin/stats") AdminStats stats() {
            return new AdminStats(farms.count(), fields.count(), recs.count(), feedback.count());
        }
    }
}

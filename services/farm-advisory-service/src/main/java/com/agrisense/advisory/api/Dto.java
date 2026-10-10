package com.agrisense.advisory.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class Dto {
    private Dto() {}

    public record FarmCreate(@NotBlank @Size(max = 80) String name, @NotBlank String stateKey,
                             @NotBlank String districtKey) {}

    public record FarmView(UUID id, String name, String stateKey, String districtKey, String state, String district,
                           double latitude, double longitude, Instant createdAt) {}

    public record SoilRecord(@DecimalMin("0") BigDecimal nitrogen, @DecimalMin("0") BigDecimal phosphorus,
                             @DecimalMin("0") BigDecimal potassium,
                             @DecimalMin("3") @DecimalMax("10") BigDecimal ph, LocalDate testedOn) {}

    public record FieldWrite(@NotBlank @Size(max = 80) String name,
                             @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("100000") BigDecimal areaAcres,
                             @Valid SoilRecord soil) {}

    public record FieldView(UUID id, UUID farmId, String farmName, String name, BigDecimal areaAcres,
                            SoilRecord soil, String soilSource, Instant createdAt) {}

    public record RecommendationCreate(@NotNull UUID fieldId, String season, String mode) {}

    public record Location(String state, String district, String stateKey, String districtKey) {}

    public record RecommendationView(UUID id, @JsonInclude(JsonInclude.Include.NON_NULL) UUID ownerId, UUID fieldId,
                                     String fieldName, String kind, String season, Location location,
                                     JsonNode regional, JsonNode weather, boolean soilUsed, JsonNode dataVersions,
                                     JsonNode limitations, Instant createdAt) {}

    public record PlanRequest(@NotBlank String crop) {}

    public record FeedbackCreate(@NotBlank @Pattern(regexp = "BUG|IDEA|DATA_ISSUE|OTHER", message = "must be one of BUG, IDEA, DATA_ISSUE, OTHER") String category,
                                 @NotBlank @Size(min = 5, max = 2000) String message,
                                 @Min(1) @Max(5) Integer rating) {}

    public record FeedbackView(UUID id, UUID ownerId, String category, String message, Integer rating, Instant createdAt) {}

    public record AlertView(UUID id, String type, String severity, String title, String message, UUID fieldId,
                            UUID farmId, String source, Instant createdAt, boolean read) {}

    public record AdminStats(long farms, long fields, long recommendations, long feedback) {}

    public record Comparison(List<String> crops, List<Row> rows, List<String> notes) {}

    public record Row(String label, List<String> values, String source) {}

    public record ActionPlan(String crop, List<PlanItem> items, String disclaimer) {}

    public record PlanItem(String kind, String title, String detail, Source source) {}

    public record Source(String type, String label, String url) {}
}

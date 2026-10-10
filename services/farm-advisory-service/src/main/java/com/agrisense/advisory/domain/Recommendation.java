package com.agrisense.advisory.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "recommendations")
public class Recommendation {
    @Id public UUID id;
    @Column(name = "owner_id") public UUID ownerId;
    @Column(name = "field_id") public UUID fieldId;
    @Column(name = "field_name") public String fieldName;
    public String kind;
    public String season;
    @Column(name = "state_key") public String stateKey;
    @Column(name = "district_key") public String districtKey;
    public String state;
    public String district;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "regional_json", columnDefinition = "jsonb") public JsonNode regionalJson;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "weather_json", columnDefinition = "jsonb") public JsonNode weatherJson;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "data_versions_json", columnDefinition = "jsonb") public JsonNode dataVersionsJson;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") public JsonNode limitations;
    @Column(name = "created_at") public Instant createdAt;
}

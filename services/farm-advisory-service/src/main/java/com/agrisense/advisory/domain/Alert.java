package com.agrisense.advisory.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alerts")
public class Alert {
    @Id public UUID id;
    @Column(name = "owner_id") public UUID ownerId;
    @Column(name = "field_id") public UUID fieldId;
    @Column(name = "farm_id") public UUID farmId;
    public String type;
    public String severity;
    public String title;
    public String message;
    public String source;
    @Column(name = "dedupe_key") public String dedupeKey;
    @Column(name = "created_at") public Instant createdAt;
    @Column(name = "read_at") public Instant readAt;
}

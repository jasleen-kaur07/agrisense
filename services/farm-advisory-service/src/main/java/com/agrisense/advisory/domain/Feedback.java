package com.agrisense.advisory.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feedback")
public class Feedback {
    @Id public UUID id;
    @Column(name = "owner_id") public UUID ownerId;
    public String category;
    public String message;
    public Integer rating;
    @Column(name = "created_at") public Instant createdAt;
}

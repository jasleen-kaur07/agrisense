package com.agrisense.advisory.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "farms")
public class Farm {
    @Id public UUID id;
    @Column(name = "owner_id") public UUID ownerId;
    public String name;
    @Column(name = "state_key") public String stateKey;
    @Column(name = "district_key") public String districtKey;
    public String state;
    public String district;
    public double latitude;
    public double longitude;
    @Column(name = "created_at") public Instant createdAt;
    @Column(name = "updated_at") public Instant updatedAt;
}

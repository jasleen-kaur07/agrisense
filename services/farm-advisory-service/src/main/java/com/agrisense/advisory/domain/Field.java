package com.agrisense.advisory.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "fields")
public class Field {
    @Id public UUID id;
    @Column(name = "farm_id") public UUID farmId;
    @Column(name = "owner_id") public UUID ownerId;
    public String name;
    @Column(name = "area_acres") public BigDecimal areaAcres;
    @Column(name = "soil_n") public BigDecimal soilN;
    @Column(name = "soil_p") public BigDecimal soilP;
    @Column(name = "soil_k") public BigDecimal soilK;
    @Column(name = "soil_ph") public BigDecimal soilPh;
    @Column(name = "soil_tested_on") public LocalDate soilTestedOn;
    @Column(name = "created_at") public Instant createdAt;
    @Column(name = "updated_at") public Instant updatedAt;

    public boolean hasSoil() {
        return soilN != null || soilP != null || soilK != null || soilPh != null || soilTestedOn != null;
    }
}

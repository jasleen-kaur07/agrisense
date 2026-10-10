package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.*;
import com.agrisense.advisory.domain.*;
import com.agrisense.advisory.domain.Repos.*;
import com.agrisense.advisory.web.ApiException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FieldService {
    private final FieldRepo fields;
    private final FarmRepo farms;

    public FieldService(FieldRepo fields, FarmRepo farms) {
        this.fields = fields;
        this.farms = farms;
    }

    private FieldView view(Field f, String farmName) {
        SoilRecord soil = f.hasSoil() ? new SoilRecord(f.soilN, f.soilP, f.soilK, f.soilPh, f.soilTestedOn) : null;
        return new FieldView(f.id, f.farmId, farmName, f.name, f.areaAcres, soil, soil == null ? null : "USER", f.createdAt);
    }

    private FieldView view(Field f) {
        return view(f, farms.findById(f.farmId).map(x -> x.name).orElse(null));
    }

    private static void setSoil(Field f, SoilRecord s) {
        if (s == null) {
            return;
        }
        f.soilN = s.nitrogen();
        f.soilP = s.phosphorus();
        f.soilK = s.potassium();
        f.soilPh = s.ph();
        f.soilTestedOn = s.testedOn();
    }

    public Field owned(UUID owner, UUID id) {
        return fields.findByIdAndOwnerId(id, owner).orElseThrow(() -> ApiException.notFound("Field"));
    }

    public List<FieldView> listForFarm(UUID owner, UUID farmId) {
        Farm farm = farms.findByIdAndOwnerId(farmId, owner).orElseThrow(() -> ApiException.notFound("Farm"));
        return fields.findByFarmIdAndOwnerIdOrderByCreatedAtAsc(farmId, owner).stream()
                .map(f -> view(f, farm.name)).toList();
    }

    public List<FieldView> listAll(UUID owner) {
        Map<UUID, String> names = new HashMap<>();
        farms.findByOwnerIdOrderByCreatedAtAsc(owner).forEach(f -> names.put(f.id, f.name));
        return fields.findByOwnerIdOrderByCreatedAtAsc(owner).stream().map(f -> view(f, names.get(f.farmId))).toList();
    }

    public FieldView get(UUID owner, UUID id) {
        return view(owned(owner, id));
    }

    public FieldView create(UUID owner, UUID farmId, FieldWrite req) {
        Farm farm = farms.findByIdAndOwnerId(farmId, owner).orElseThrow(() -> ApiException.notFound("Farm"));
        Field f = new Field();
        f.id = UUID.randomUUID();
        f.farmId = farm.id;
        f.ownerId = owner;
        f.name = req.name().trim();
        f.areaAcres = req.areaAcres();
        setSoil(f, req.soil());
        f.createdAt = Instant.now();
        f.updatedAt = f.createdAt;
        return view(fields.save(f), farm.name);
    }

    /** Soil is left untouched when the request carries no soil object. */
    public FieldView update(UUID owner, UUID id, FieldWrite req) {
        Field f = owned(owner, id);
        f.name = req.name().trim();
        f.areaAcres = req.areaAcres();
        setSoil(f, req.soil());
        f.updatedAt = Instant.now();
        return view(fields.save(f));
    }

    public FieldView putSoil(UUID owner, UUID id, SoilRecord soil) {
        Field f = owned(owner, id);
        setSoil(f, soil == null ? new SoilRecord(null, null, null, null, null) : soil);
        f.updatedAt = Instant.now();
        return view(fields.save(f));
    }

    public void deleteSoil(UUID owner, UUID id) {
        putSoil(owner, id, new SoilRecord(null, null, null, null, null));
    }

    public void delete(UUID owner, UUID id) {
        if (fields.deleteOwned(id, owner) == 0) {
            throw ApiException.notFound("Field");
        }
    }
}

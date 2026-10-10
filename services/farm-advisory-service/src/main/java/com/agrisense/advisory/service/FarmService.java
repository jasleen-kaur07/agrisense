package com.agrisense.advisory.service;

import com.agrisense.advisory.api.Dto.*;
import com.agrisense.advisory.client.DataClient;
import com.agrisense.advisory.domain.*;
import com.agrisense.advisory.domain.Repos.*;
import com.agrisense.advisory.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FarmService {
    private final FarmRepo farms;
    private final DataClient data;

    public FarmService(FarmRepo farms, DataClient data) {
        this.farms = farms;
        this.data = data;
    }

    static FarmView view(Farm f) {
        return new FarmView(f.id, f.name, f.stateKey, f.districtKey, f.state, f.district, f.latitude, f.longitude, f.createdAt);
    }

    public List<FarmView> list(UUID owner) {
        return farms.findByOwnerIdOrderByCreatedAtAsc(owner).stream().map(FarmService::view).toList();
    }

    public Farm owned(UUID owner, UUID id) {
        return farms.findByIdAndOwnerId(id, owner).orElseThrow(() -> ApiException.notFound("Farm"));
    }

    public FarmView get(UUID owner, UUID id) {
        return view(owned(owner, id));
    }

    private void apply(Farm f, FarmCreate req) {
        JsonNode loc;
        try {
            loc = data.location(req.stateKey(), req.districtKey()).orElse(null);
        } catch (DataClient.DataUnavailableException e) {
            throw e.toApi();
        }
        if (loc == null) {
            throw ApiException.validation("districtKey", "unsupported state/district combination");
        }
        f.name = req.name().trim();
        f.stateKey = loc.path("stateKey").asText(req.stateKey());
        f.districtKey = loc.path("districtKey").asText(req.districtKey());
        f.state = loc.path("state").asText();
        f.district = loc.path("district").asText();
        f.latitude = loc.path("latitude").asDouble();
        f.longitude = loc.path("longitude").asDouble();
        f.updatedAt = Instant.now();
    }

    public FarmView create(UUID owner, FarmCreate req) {
        Farm f = new Farm();
        f.id = UUID.randomUUID();
        f.ownerId = owner;
        f.createdAt = Instant.now();
        apply(f, req);
        return view(farms.save(f));
    }

    public FarmView update(UUID owner, UUID id, FarmCreate req) {
        Farm f = owned(owner, id);
        apply(f, req);
        return view(farms.save(f));
    }

    public void delete(UUID owner, UUID id) {
        if (farms.deleteOwned(id, owner) == 0) {
            throw ApiException.notFound("Farm");
        }
    }
}

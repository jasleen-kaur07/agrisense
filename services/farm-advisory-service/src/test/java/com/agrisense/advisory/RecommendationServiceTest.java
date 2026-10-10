package com.agrisense.advisory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.agrisense.advisory.api.Dto.RecommendationCreate;
import com.agrisense.advisory.client.DataClient;
import com.agrisense.advisory.domain.Recommendation;
import com.agrisense.advisory.domain.Repos.RecRepo;
import com.agrisense.advisory.service.FieldService;
import com.agrisense.advisory.service.RecommendationService;
import com.agrisense.advisory.web.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionTemplate;

class RecommendationServiceTest {
    @Test
    void sameKeyReplaysStoredRecommendationWithoutCallingDataService() {
        RecRepo repo = mock(RecRepo.class);
        DataClient data = mock(DataClient.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UUID owner = UUID.randomUUID(), recId = UUID.randomUUID(), key = UUID.randomUUID();
        when(jdbc.query(anyString(), any(RowMapper.class), eq(owner), eq(key))).thenReturn(List.of(recId));
        Recommendation r = new Recommendation();
        r.id = recId;
        r.ownerId = owner;
        r.season = "KHARIF";
        when(repo.findByIdAndOwnerId(recId, owner)).thenReturn(Optional.of(r));
        RecommendationService s = new RecommendationService(repo, mock(FieldService.class), data, jdbc,
                mock(TransactionTemplate.class), new ObjectMapper());
        var res = s.create(owner, new RecommendationCreate(UUID.randomUUID(), null, null), key.toString());
        assertThat(res.created()).isFalse();
        assertThat(res.view().id()).isEqualTo(recId);
        verifyNoInteractions(data);
    }

    @Test
    void keyMustBeUuidAndModeMustBeRegional() {
        assertThat(RecommendationService.parseKey(null)).isNull();
        assertThatThrownBy(() -> RecommendationService.parseKey("abc")).isInstanceOf(ApiException.class);
        RecommendationService s = new RecommendationService(mock(RecRepo.class), mock(FieldService.class),
                mock(DataClient.class), mock(JdbcTemplate.class), mock(TransactionTemplate.class), new ObjectMapper());
        assertThatThrownBy(() -> s.create(UUID.randomUUID(), new RecommendationCreate(UUID.randomUUID(), null, "SOIL_TEST"), null))
                .hasMessage("mode SOIL_TEST is not available");
    }
}

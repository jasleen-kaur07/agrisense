package com.agrisense.advisory.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public final class Repos {
    private Repos() {}

    public interface FarmRepo extends JpaRepository<Farm, UUID> {
        List<Farm> findByOwnerIdOrderByCreatedAtAsc(UUID ownerId);
        Optional<Farm> findByIdAndOwnerId(UUID id, UUID ownerId);
        @Transactional @Modifying @Query("delete from Farm f where f.id = :id and f.ownerId = :owner")
        int deleteOwned(@Param("id") UUID id, @Param("owner") UUID owner);
    }

    public interface FieldRepo extends JpaRepository<Field, UUID> {
        List<Field> findByOwnerIdOrderByCreatedAtAsc(UUID ownerId);
        List<Field> findByFarmIdAndOwnerIdOrderByCreatedAtAsc(UUID farmId, UUID ownerId);
        Optional<Field> findByIdAndOwnerId(UUID id, UUID ownerId);
        @Transactional @Modifying @Query("delete from Field f where f.id = :id and f.ownerId = :owner")
        int deleteOwned(@Param("id") UUID id, @Param("owner") UUID owner);
    }

    public interface RecRepo extends JpaRepository<Recommendation, UUID> {
        Page<Recommendation> findByOwnerId(UUID ownerId, Pageable p);
        Page<Recommendation> findByOwnerIdAndFieldId(UUID ownerId, UUID fieldId, Pageable p);
        Optional<Recommendation> findByIdAndOwnerId(UUID id, UUID ownerId);
        @Transactional @Modifying @Query("delete from Recommendation r where r.id = :id and r.ownerId = :owner")
        int deleteOwned(@Param("id") UUID id, @Param("owner") UUID owner);
    }

    public interface AlertRepo extends JpaRepository<Alert, UUID> {
        List<Alert> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
        List<Alert> findByOwnerIdAndReadAtIsNullOrderByCreatedAtDesc(UUID ownerId);
        Optional<Alert> findByIdAndOwnerId(UUID id, UUID ownerId);
    }

    public interface FeedbackRepo extends JpaRepository<Feedback, UUID> {}
}

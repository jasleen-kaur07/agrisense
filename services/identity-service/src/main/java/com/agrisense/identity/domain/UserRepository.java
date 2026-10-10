package com.agrisense.identity.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("select u from User u where lower(u.email) like :p escape '!' or lower(coalesce(u.displayName, '')) like :p escape '!'")
    Page<User> search(@Param("p") String pattern, Pageable pageable);
}

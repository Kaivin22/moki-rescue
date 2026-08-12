package com.danang.itinerary.repository;

import com.danang.itinerary.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Profile p where p.id = :id")
    Optional<Profile> findByIdForUpdate(@Param("id") UUID id);
}

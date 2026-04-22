package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.BodyMeasurement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, Long> {

    List<BodyMeasurement> findAllByOwnerOrderByDateAsc(AppUser owner);

    Optional<BodyMeasurement> findByOwnerAndDate(AppUser owner, LocalDate date);

    Optional<BodyMeasurement> findByIdAndOwner(Long id, AppUser owner);
}

package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.BodyMeasurementDto;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.BodyMeasurement;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.BodyMeasurementRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BodyMeasurementService {

    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final AppUserRepository appUserRepository;

    @Transactional(readOnly = true)
    public List<BodyMeasurementDto> getAll(String username) {
        AppUser currentUser = getCurrentUser(username);
        return bodyMeasurementRepository.findAllByOwnerOrderByDateAsc(currentUser)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public BodyMeasurementDto createOrUpdate(BodyMeasurementDto dto, String username) {
        validateAtLeastOneMetric(dto);
        AppUser currentUser = getCurrentUser(username);
        BodyMeasurement measurement = bodyMeasurementRepository.findByOwnerAndDate(currentUser, dto.date())
                .orElseGet(() -> BodyMeasurement.builder()
                        .owner(currentUser)
                        .date(dto.date())
                        .build());

        measurement.setWeight(dto.weight());
        measurement.setWaist(dto.waist());
        measurement.setChest(dto.chest());
        measurement.setLeftArm(dto.leftArm());
        measurement.setRightArm(dto.rightArm());

        BodyMeasurement saved = bodyMeasurementRepository.save(measurement);
        return toDto(saved);
    }

    @Transactional
    public boolean deleteById(Long id, String username) {
        AppUser currentUser = getCurrentUser(username);
        return bodyMeasurementRepository.findByIdAndOwner(id, currentUser)
                .map(entity -> {
                    bodyMeasurementRepository.delete(entity);
                    return true;
                })
                .orElse(false);
    }

    private void validateAtLeastOneMetric(BodyMeasurementDto dto) {
        if (dto.weight() == null
                && dto.waist() == null
                && dto.chest() == null
                && dto.leftArm() == null
                && dto.rightArm() == null) {
            throw new IllegalArgumentException("At least one measurement value is required.");
        }
    }

    private AppUser getCurrentUser(String username) {
        return appUserRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));
    }

    private BodyMeasurementDto toDto(BodyMeasurement entity) {
        return new BodyMeasurementDto(
                entity.getId(),
                entity.getDate(),
                entity.getWeight(),
                entity.getWaist(),
                entity.getChest(),
                entity.getLeftArm(),
                entity.getRightArm()
        );
    }
}

package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.BodyMeasurementDto;
import com.fitnesstracker.backend.dto.PatchProgressPhotoMeasurementDto;
import com.fitnesstracker.backend.dto.ProgressPhotoDto;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.BodyMeasurement;
import com.fitnesstracker.backend.model.ProgressPhoto;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.BodyMeasurementRepository;
import com.fitnesstracker.backend.repository.ProgressPhotoRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgressPhotoService {

    private final ProgressPhotoRepository progressPhotoRepository;
    private final AppUserRepository appUserRepository;
    private final BodyMeasurementRepository bodyMeasurementRepository;

    @Transactional(readOnly = true)
    public List<ProgressPhotoDto> getAll(String username) {
        AppUser currentUser = getCurrentUser(username);
        return progressPhotoRepository.findAllByOwnerOrderByCapturedAtDesc(currentUser).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ProgressPhotoDto create(ProgressPhotoDto dto, String username) {
        AppUser currentUser = getCurrentUser(username);
        BodyMeasurement linked = resolveLinkedMeasurement(dto.bodyMeasurementId(), currentUser);
        ProgressPhoto photo = ProgressPhoto.builder()
                .capturedAt(dto.capturedAt())
                .imageDataUrl(dto.imageDataUrl())
                .note(dto.note() != null ? dto.note().trim() : null)
                .reminderDate(dto.reminderDate())
                .linkedMeasurement(linked)
                .owner(currentUser)
                .build();
        ProgressPhoto saved = progressPhotoRepository.save(photo);
        return toDto(saved);
    }

    private BodyMeasurement resolveLinkedMeasurement(Long measurementId, AppUser owner) {
        if (measurementId == null) {
            return null;
        }
        return bodyMeasurementRepository
                .findByIdAndOwner(measurementId, owner)
                .orElseThrow(() -> new IllegalArgumentException("Measurement not found or does not belong to you."));
    }

    @Transactional
    public Optional<ProgressPhotoDto> patchLinkedMeasurement(
            Long photoId, PatchProgressPhotoMeasurementDto dto, String username) {
        AppUser currentUser = getCurrentUser(username);
        return progressPhotoRepository.findByIdAndOwner(photoId, currentUser).map(photo -> {
            BodyMeasurement linked = resolveLinkedMeasurement(dto.bodyMeasurementId(), currentUser);
            photo.setLinkedMeasurement(linked);
            return toDto(progressPhotoRepository.save(photo));
        });
    }

    @Transactional
    public boolean deleteById(Long id, String username) {
        AppUser currentUser = getCurrentUser(username);
        return progressPhotoRepository.findByIdAndOwner(id, currentUser)
                .map(entity -> {
                    progressPhotoRepository.delete(entity);
                    return true;
                })
                .orElse(false);
    }

    private AppUser getCurrentUser(String username) {
        return appUserRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));
    }

    private ProgressPhotoDto toDto(ProgressPhoto entity) {
        BodyMeasurement linked = entity.getLinkedMeasurement();
        Long measurementId = linked != null ? linked.getId() : null;
        BodyMeasurementDto measurementDto = linked != null ? toMeasurementDto(linked) : null;
        return new ProgressPhotoDto(
                entity.getId(),
                entity.getCapturedAt(),
                entity.getImageDataUrl(),
                entity.getNote(),
                entity.getReminderDate(),
                measurementId,
                measurementDto
        );
    }

    private BodyMeasurementDto toMeasurementDto(BodyMeasurement entity) {
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

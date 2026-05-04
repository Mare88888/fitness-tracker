package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.ProgressPhotoDto;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.ProgressPhoto;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.ProgressPhotoRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgressPhotoService {

    private final ProgressPhotoRepository progressPhotoRepository;
    private final AppUserRepository appUserRepository;

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
        ProgressPhoto photo = ProgressPhoto.builder()
                .capturedAt(dto.capturedAt())
                .imageDataUrl(dto.imageDataUrl())
                .note(dto.note() != null ? dto.note().trim() : null)
                .reminderDate(dto.reminderDate())
                .owner(currentUser)
                .build();
        ProgressPhoto saved = progressPhotoRepository.save(photo);
        return toDto(saved);
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
        return new ProgressPhotoDto(
                entity.getId(),
                entity.getCapturedAt(),
                entity.getImageDataUrl(),
                entity.getNote(),
                entity.getReminderDate()
        );
    }
}

package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.PatchProgressPhotoMeasurementDto;
import com.fitnesstracker.backend.dto.ProgressPhotoDto;
import com.fitnesstracker.backend.service.ProgressPhotoService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/progress-photos")
@RequiredArgsConstructor
public class ProgressPhotoController {

    private final ProgressPhotoService progressPhotoService;

    @GetMapping
    public ResponseEntity<List<ProgressPhotoDto>> getAll(Authentication authentication) {
        return ResponseEntity.ok(progressPhotoService.getAll(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<ProgressPhotoDto> create(
            @Valid @RequestBody ProgressPhotoDto dto,
            Authentication authentication
    ) {
        ProgressPhotoDto saved = progressPhotoService.create(dto, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PatchMapping("/{id}/linked-measurement")
    public ResponseEntity<ProgressPhotoDto> patchLinkedMeasurement(
            @PathVariable Long id,
            @RequestBody PatchProgressPhotoMeasurementDto dto,
            Authentication authentication) {
        return progressPhotoService
                .patchLinkedMeasurement(id, dto, authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id, Authentication authentication) {
        if (!progressPhotoService.deleteById(id, authentication.getName())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}

package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.BodyMeasurementDto;
import com.fitnesstracker.backend.service.BodyMeasurementService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/body-measurements")
@RequiredArgsConstructor
public class BodyMeasurementController {

    private final BodyMeasurementService bodyMeasurementService;

    @GetMapping
    public ResponseEntity<List<BodyMeasurementDto>> getAll(Authentication authentication) {
        return ResponseEntity.ok(bodyMeasurementService.getAll(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<BodyMeasurementDto> createOrUpdate(
            @Valid @RequestBody BodyMeasurementDto dto,
            Authentication authentication
    ) {
        BodyMeasurementDto saved = bodyMeasurementService.createOrUpdate(dto, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id, Authentication authentication) {
        if (!bodyMeasurementService.deleteById(id, authentication.getName())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}

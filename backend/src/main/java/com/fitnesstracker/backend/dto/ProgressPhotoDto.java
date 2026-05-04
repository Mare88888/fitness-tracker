package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ProgressPhotoDto(
        Long id,
        @NotNull(message = "Photo date is required.")
        LocalDate capturedAt,
        @NotBlank(message = "Photo data is required.")
        @Size(max = 8_000_000, message = "Photo is too large.")
        String imageDataUrl,
        @Size(max = 400, message = "Photo note cannot exceed 400 characters.")
        String note,
        LocalDate reminderDate
) {
}

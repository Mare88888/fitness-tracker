package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record ExerciseSetDto(
        Long id,
        @NotNull(message = "Set reps are required.")
        @Min(value = 1, message = "Set reps must be at least 1.")
        Integer reps,
        @NotNull(message = "Set weight is required.")
        @DecimalMin(value = "0.0", inclusive = true, message = "Set weight must be 0 or greater.")
        Double weight
) {
}

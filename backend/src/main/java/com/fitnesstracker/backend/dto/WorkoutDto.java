package com.fitnesstracker.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;

@Builder
public record WorkoutDto(
        Long id,
        @NotBlank(message = "Workout name is required.")
        String name,
        @NotNull(message = "Workout date is required.")
        LocalDate date,
        @NotEmpty(message = "Workout must include at least one exercise.")
        List<@Valid ExerciseDto> exercises
) {
}

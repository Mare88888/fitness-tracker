package com.fitnesstracker.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Builder;

@Builder
public record WorkoutTemplateDto(
        Long id,
        @NotBlank(message = "Template name is required.")
        String name,
        @NotEmpty(message = "Template must include at least one exercise.")
        List<@Valid ExerciseDto> exercises
) {
}

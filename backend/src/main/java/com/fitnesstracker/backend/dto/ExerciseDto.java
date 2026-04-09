package com.fitnesstracker.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Builder;

@Builder
public record ExerciseDto(
        Long id,
        @NotBlank(message = "Exercise name is required.")
        String name,
        @NotEmpty(message = "Exercise must include at least one set.")
        List<@Valid ExerciseSetDto> sets
) {
}

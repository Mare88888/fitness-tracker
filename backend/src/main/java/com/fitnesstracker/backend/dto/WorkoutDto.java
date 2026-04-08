package com.fitnesstracker.backend.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;

@Builder
public record WorkoutDto(
        Long id,
        String name,
        LocalDate date,
        List<ExerciseDto> exercises
) {
}

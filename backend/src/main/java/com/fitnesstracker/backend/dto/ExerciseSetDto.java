package com.fitnesstracker.backend.dto;

import lombok.Builder;

@Builder
public record ExerciseSetDto(
        Long id,
        Integer reps,
        Double weight
) {
}

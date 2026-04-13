package com.fitnesstracker.backend.dto;

import lombok.Builder;

@Builder
public record ExerciseCatalogDto(
        Long id,
        String name,
        String muscleGroup
) {
}

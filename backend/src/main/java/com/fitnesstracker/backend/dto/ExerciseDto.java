package com.fitnesstracker.backend.dto;

import java.util.List;
import lombok.Builder;

@Builder
public record ExerciseDto(
        Long id,
        String name,
        List<ExerciseSetDto> sets
) {
}

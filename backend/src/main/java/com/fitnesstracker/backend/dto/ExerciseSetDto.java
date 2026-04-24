package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;

@Builder
public record ExerciseSetDto(
        Long id,
        @Min(value = 1, message = "Set reps must be at least 1.")
        Integer reps,
        @NotNull(message = "Set weight is required.")
        @DecimalMin(value = "0.0", inclusive = true, message = "Set weight must be 0 or greater.")
        Double weight,
        @Min(value = 1, message = "Set duration must be at least 1 second.")
        Integer durationSeconds,
        Boolean completed,
        @Pattern(
                regexp = "normal|warmup|failure|drop",
                message = "Set type must be one of: normal, warmup, failure, drop."
        )
        String type
) {
    @AssertTrue(message = "Each set must include reps or duration.")
    public boolean hasRepsOrDuration() {
        return (reps != null && reps >= 1) || (durationSeconds != null && durationSeconds >= 1);
    }
}

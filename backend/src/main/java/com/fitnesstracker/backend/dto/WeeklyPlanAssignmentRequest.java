package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.NotNull;

public record WeeklyPlanAssignmentRequest(
        @NotNull(message = "Template id is required.")
        Long templateId
) {
}

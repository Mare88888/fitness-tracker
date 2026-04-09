package com.fitnesstracker.backend.dto;

import lombok.Builder;

@Builder
public record WeeklyPlanDto(
        Long id,
        Integer dayOfWeek,
        Long templateId,
        String templateName
) {
}

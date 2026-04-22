package com.fitnesstracker.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record BodyMeasurementDto(
        Long id,
        @NotNull(message = "Date is required.") LocalDate date,
        @DecimalMin(value = "0.0", inclusive = false, message = "Weight must be greater than 0.")
        Double weight,
        @DecimalMin(value = "0.0", inclusive = false, message = "Waist must be greater than 0.")
        Double waist,
        @DecimalMin(value = "0.0", inclusive = false, message = "Chest must be greater than 0.")
        Double chest,
        @DecimalMin(value = "0.0", inclusive = false, message = "Left arm must be greater than 0.")
        Double leftArm,
        @DecimalMin(value = "0.0", inclusive = false, message = "Right arm must be greater than 0.")
        Double rightArm
) {
}

package com.fitnesstracker.backend.exception;

public record FieldValidationError(
        String field,
        String message
) {
}

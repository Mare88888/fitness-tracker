package com.fitnesstracker.backend.dto;

public record AuthResponse(
        String token,
        String username
) {
}

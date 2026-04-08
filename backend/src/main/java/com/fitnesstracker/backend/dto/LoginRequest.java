package com.fitnesstracker.backend.dto;

public record LoginRequest(
        String username,
        String password
) {
}

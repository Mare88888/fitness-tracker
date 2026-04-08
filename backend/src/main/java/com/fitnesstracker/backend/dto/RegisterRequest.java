package com.fitnesstracker.backend.dto;

public record RegisterRequest(
        String username,
        String password
) {
}

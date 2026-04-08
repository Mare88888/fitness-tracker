package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.AuthResponse;
import com.fitnesstracker.backend.dto.LoginRequest;
import com.fitnesstracker.backend.dto.RegisterRequest;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        if (username.isEmpty() || request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Username and password are required.");
        }
        if (appUserRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists.");
        }

        AppUser user = AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .build();
        appUserRepository.save(user);

        String token = jwtService.generateToken(username);
        return new AuthResponse(token, username);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String username = authentication.getName();
        String token = jwtService.generateToken(username);
        return new AuthResponse(token, username);
    }
}

package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.RefreshTokenRepository;
import com.fitnesstracker.backend.repository.WorkoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private WorkoutRepository workoutRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        workoutRepository.deleteAll();
        appUserRepository.deleteAll();
    }

    @Test
    void registerReturnsCookiesAndUsername() throws Exception {
        String requestBody = """
                {
                  "username": "integration-user",
                  "password": "password123"
                }
                """;

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("integration-user"))
                .andExpect(result -> {
                    var cookies = result.getResponse().getHeaders("Set-Cookie");
                    boolean hasAccessCookie = cookies.stream().anyMatch(cookie -> cookie.contains("fitness_access_token"));
                    boolean hasRefreshCookie = cookies.stream().anyMatch(cookie -> cookie.contains("fitness_refresh_token"));
                    if (!hasAccessCookie || !hasRefreshCookie) {
                        throw new AssertionError("Expected auth cookies in Set-Cookie headers.");
                    }
                });
    }

    @Test
    void loginReturnsCookiesForExistingUser() throws Exception {
        appUserRepository.save(AppUser.builder()
                .username("login-user")
                .password(passwordEncoder.encode("password123"))
                .build());

        String requestBody = """
                {
                  "username": "login-user",
                  "password": "password123"
                }
                """;

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("login-user"))
                .andExpect(result -> {
                    var cookies = result.getResponse().getHeaders("Set-Cookie");
                    boolean hasAccessCookie = cookies.stream().anyMatch(cookie -> cookie.contains("fitness_access_token"));
                    boolean hasRefreshCookie = cookies.stream().anyMatch(cookie -> cookie.contains("fitness_refresh_token"));
                    if (!hasAccessCookie || !hasRefreshCookie) {
                        throw new AssertionError("Expected auth cookies in Set-Cookie headers.");
                    }
                });
    }
}

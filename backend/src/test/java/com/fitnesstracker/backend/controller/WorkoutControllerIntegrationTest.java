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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkoutControllerIntegrationTest {

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
        appUserRepository.save(AppUser.builder()
                .username("workout-user")
                .password(passwordEncoder.encode("password123"))
                .build());
    }

    @Test
    @WithMockUser(username = "workout-user")
    void createAndGetWorkoutsForAuthenticatedUser() throws Exception {
        String requestBody = """
                {
                  "name": "Push Day",
                  "date": "2026-04-09",
                  "exercises": [
                    {
                      "name": "Bench Press",
                      "sets": [
                        {"reps": 8, "weight": 60.0}
                      ]
                    }
                  ]
                }
                """;

        mockMvc.perform(post("/workouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Push Day"));

        mockMvc.perform(get("/workouts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Push Day"));
    }

    @Test
    void getWorkoutsRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/workouts"))
                .andExpect(status().isForbidden());
    }
}

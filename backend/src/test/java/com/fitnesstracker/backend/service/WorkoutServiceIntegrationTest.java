package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.ExerciseDto;
import com.fitnesstracker.backend.dto.ExerciseSetDto;
import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.WorkoutRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class WorkoutServiceIntegrationTest {

    @Autowired
    private WorkoutService workoutService;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private WorkoutRepository workoutRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        workoutRepository.deleteAll();
        appUserRepository.deleteAll();
        appUserRepository.save(AppUser.builder()
                .username("owner-user")
                .password(passwordEncoder.encode("password123"))
                .build());
        appUserRepository.save(AppUser.builder()
                .username("other-user")
                .password(passwordEncoder.encode("password123"))
                .build());
    }

    @Test
    void userIsolationAppliesInServiceLayer() {
        WorkoutDto payload = WorkoutDto.builder()
                .name("Leg Day")
                .date(LocalDate.now())
                .exercises(List.of(ExerciseDto.builder()
                        .name("Squat")
                        .sets(List.of(ExerciseSetDto.builder().reps(5).weight(100.0).build()))
                        .build()))
                .build();

        WorkoutDto created = workoutService.createWorkout(payload, "owner-user");
        assertEquals("Leg Day", created.name());

        List<WorkoutDto> ownerWorkouts = workoutService.getAllWorkouts("owner-user");
        List<WorkoutDto> otherWorkouts = workoutService.getAllWorkouts("other-user");

        assertEquals(1, ownerWorkouts.size());
        assertTrue(otherWorkouts.isEmpty());
        assertFalse(workoutService.deleteWorkoutById(created.id(), "other-user"));
        assertTrue(workoutService.deleteWorkoutById(created.id(), "owner-user"));
    }
}

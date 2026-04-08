package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.service.WorkoutService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    @GetMapping
    public ResponseEntity<List<WorkoutDto>> getAllWorkouts(Authentication authentication) {
        return ResponseEntity.ok(workoutService.getAllWorkouts(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutDto> getWorkoutById(@PathVariable Long id, Authentication authentication) {
        return workoutService.getWorkoutById(id, authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<WorkoutDto> createWorkout(
            @RequestBody WorkoutDto workoutDto, Authentication authentication) {
        WorkoutDto createdWorkout = workoutService.createWorkout(workoutDto, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdWorkout);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkout(@PathVariable Long id, Authentication authentication) {
        if (!workoutService.deleteWorkoutById(id, authentication.getName())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}

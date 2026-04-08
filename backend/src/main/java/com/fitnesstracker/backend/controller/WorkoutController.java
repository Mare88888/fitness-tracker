package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.service.WorkoutService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    @GetMapping
    public List<WorkoutDto> getAllWorkouts() {
        return workoutService.getAllWorkouts();
    }
}

package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.mapper.WorkoutMapper;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.Workout;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.WorkoutRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutMapper workoutMapper;
    private final AppUserRepository appUserRepository;
    private final ExerciseCatalogService exerciseCatalogService;

    @Transactional(readOnly = true)
    public List<WorkoutDto> getAllWorkouts(String username) {
        AppUser currentUser = getCurrentUser(username);
        return workoutRepository.findAllWithDetailsByOwner(currentUser).stream()
                .map(workoutMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<WorkoutDto> getWorkoutById(Long id, String username) {
        AppUser currentUser = getCurrentUser(username);
        return workoutRepository.findWithDetailsByIdAndOwner(id, currentUser)
                .map(workoutMapper::toDto);
    }

    @Transactional
    public WorkoutDto createWorkout(WorkoutDto workoutDto, String username) {
        AppUser currentUser = getCurrentUser(username);
        Workout workout = workoutMapper.toEntity(workoutDto);
        exerciseCatalogService.attachCatalogToExercises(workout.getExercises());
        workout.setOwner(currentUser);
        Workout savedWorkout = workoutRepository.save(workout);
        return workoutMapper.toDto(savedWorkout);
    }

    @Transactional
    public Optional<WorkoutDto> updateWorkout(Long id, WorkoutDto workoutDto, String username) {
        AppUser currentUser = getCurrentUser(username);
        Optional<Workout> existingWorkoutOptional = workoutRepository.findWithDetailsByIdAndOwner(id, currentUser);
        if (existingWorkoutOptional.isEmpty()) {
            return Optional.empty();
        }

        Workout existingWorkout = existingWorkoutOptional.get();
        Workout mappedWorkout = workoutMapper.toEntity(workoutDto);
        exerciseCatalogService.attachCatalogToExercises(mappedWorkout.getExercises());

        existingWorkout.setName(mappedWorkout.getName());
        existingWorkout.setDate(mappedWorkout.getDate());
        existingWorkout.getExercises().clear();
        mappedWorkout.getExercises().forEach(exercise -> {
            exercise.setWorkout(existingWorkout);
            existingWorkout.getExercises().add(exercise);
        });

        Workout savedWorkout = workoutRepository.save(existingWorkout);
        return Optional.of(workoutMapper.toDto(savedWorkout));
    }

    @Transactional
    public boolean deleteWorkoutById(Long id, String username) {
        AppUser currentUser = getCurrentUser(username);
        Optional<Workout> workout = workoutRepository.findWithDetailsByIdAndOwner(id, currentUser);
        if (workout.isEmpty()) {
            return false;
        }
        workoutRepository.delete(workout.get());
        return true;
    }

    private AppUser getCurrentUser(String username) {
        return appUserRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));
    }
}

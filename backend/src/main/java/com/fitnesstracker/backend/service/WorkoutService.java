package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.mapper.WorkoutMapper;
import com.fitnesstracker.backend.model.Workout;
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

    @Transactional(readOnly = true)
    public List<WorkoutDto> getAllWorkouts() {
        return workoutRepository.findAllWithDetailsBy().stream()
                .map(workoutMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<WorkoutDto> getWorkoutById(Long id) {
        return workoutRepository.findWithDetailsById(id)
                .map(workoutMapper::toDto);
    }

    @Transactional
    public WorkoutDto createWorkout(WorkoutDto workoutDto) {
        Workout workout = workoutMapper.toEntity(workoutDto);
        Workout savedWorkout = workoutRepository.save(workout);
        return workoutMapper.toDto(savedWorkout);
    }

    @Transactional
    public boolean deleteWorkoutById(Long id) {
        if (!workoutRepository.existsById(id)) {
            return false;
        }
        workoutRepository.deleteById(id);
        return true;
    }
}

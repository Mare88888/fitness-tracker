package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.mapper.WorkoutMapper;
import com.fitnesstracker.backend.repository.WorkoutRepository;
import java.util.List;
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
}

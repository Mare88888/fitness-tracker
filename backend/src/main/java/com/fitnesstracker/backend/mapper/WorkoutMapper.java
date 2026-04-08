package com.fitnesstracker.backend.mapper;

import com.fitnesstracker.backend.dto.ExerciseDto;
import com.fitnesstracker.backend.dto.ExerciseSetDto;
import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.model.Exercise;
import com.fitnesstracker.backend.model.Set;
import com.fitnesstracker.backend.model.Workout;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class WorkoutMapper {

    public WorkoutDto toDto(Workout workout) {
        return WorkoutDto.builder()
                .id(workout.getId())
                .name(workout.getName())
                .date(workout.getDate())
                .exercises(toExerciseDtos(workout.getExercises()))
                .build();
    }

    private List<ExerciseDto> toExerciseDtos(List<Exercise> exercises) {
        return exercises.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseDto toDto(Exercise exercise) {
        return ExerciseDto.builder()
                .id(exercise.getId())
                .name(exercise.getName())
                .sets(toSetDtos(exercise.getSets()))
                .build();
    }

    private List<ExerciseSetDto> toSetDtos(List<Set> sets) {
        return sets.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseSetDto toDto(Set set) {
        return ExerciseSetDto.builder()
                .id(set.getId())
                .reps(set.getReps())
                .weight(set.getWeight())
                .restTime(set.getRestTime())
                .build();
    }
}

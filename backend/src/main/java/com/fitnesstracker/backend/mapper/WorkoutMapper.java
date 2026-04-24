package com.fitnesstracker.backend.mapper;

import com.fitnesstracker.backend.dto.ExerciseDto;
import com.fitnesstracker.backend.dto.ExerciseSetDto;
import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.model.Exercise;
import com.fitnesstracker.backend.model.Workout;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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

    public Workout toEntity(WorkoutDto workoutDto) {
        Workout workout = Workout.builder()
                .name(workoutDto.name())
                .date(workoutDto.date())
                .exercises(new LinkedHashSet<>())
                .build();

        Set<Exercise> exercises = toExercises(workoutDto.exercises(), workout);
        workout.setExercises(exercises);
        return workout;
    }

    private List<ExerciseDto> toExerciseDtos(Collection<Exercise> exercises) {
        if (exercises == null) {
            return Collections.emptyList();
        }
        return exercises.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseDto toDto(Exercise exercise) {
        return ExerciseDto.builder()
                .id(exercise.getId())
                .catalogId(exercise.getCatalog() != null ? exercise.getCatalog().getId() : null)
                .name(exercise.getName())
                .note(exercise.getNote())
                .muscleGroup(exercise.getCatalog() != null ? exercise.getCatalog().getMuscleGroup() : null)
                .sets(toSetDtos(exercise.getSets()))
                .build();
    }

    private List<ExerciseSetDto> toSetDtos(Collection<com.fitnesstracker.backend.model.Set> sets) {
        if (sets == null) {
            return Collections.emptyList();
        }
        return sets.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseSetDto toDto(com.fitnesstracker.backend.model.Set set) {
        return ExerciseSetDto.builder()
                .id(set.getId())
                .reps(set.getReps())
                .weight(set.getWeight())
                .durationSeconds(set.getDurationSeconds())
                .completed(set.getCompleted())
                .type(set.getType())
                .build();
    }

    private Set<Exercise> toExercises(List<ExerciseDto> exerciseDtos, Workout workout) {
        if (exerciseDtos == null) {
            return new LinkedHashSet<>();
        }
        return new LinkedHashSet<>(exerciseDtos.stream()
                .map(exerciseDto -> toExercise(exerciseDto, workout))
                .toList());
    }

    private Exercise toExercise(ExerciseDto exerciseDto, Workout workout) {
        Exercise exercise = Exercise.builder()
                .name(exerciseDto.name())
                .note(exerciseDto.note())
                .workout(workout)
                .sets(new LinkedHashSet<>())
                .build();

        Set<com.fitnesstracker.backend.model.Set> sets = toSets(exerciseDto.sets(), exercise);
        exercise.setSets(sets);
        return exercise;
    }

    private Set<com.fitnesstracker.backend.model.Set> toSets(
            List<ExerciseSetDto> setDtos, Exercise exercise) {
        if (setDtos == null) {
            return new LinkedHashSet<>();
        }
        return new LinkedHashSet<>(setDtos.stream()
                .map(setDto -> com.fitnesstracker.backend.model.Set.builder()
                        .reps(setDto.reps())
                        .weight(setDto.weight())
                        .durationSeconds(setDto.durationSeconds())
                        .completed(Boolean.TRUE.equals(setDto.completed()))
                        .type(setDto.type() != null ? setDto.type() : "normal")
                        .exercise(exercise)
                        .build())
                .toList());
    }
}

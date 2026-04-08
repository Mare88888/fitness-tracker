package com.fitnesstracker.backend.mapper;

import com.fitnesstracker.backend.dto.ExerciseDto;
import com.fitnesstracker.backend.dto.ExerciseSetDto;
import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.model.Exercise;
import com.fitnesstracker.backend.model.Set;
import com.fitnesstracker.backend.model.Workout;
import java.util.ArrayList;
import java.util.Collections;
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

    public Workout toEntity(WorkoutDto workoutDto) {
        Workout workout = Workout.builder()
                .name(workoutDto.name())
                .date(workoutDto.date())
                .exercises(new ArrayList<>())
                .build();

        List<Exercise> exercises = toExercises(workoutDto.exercises(), workout);
        workout.setExercises(exercises);
        return workout;
    }

    private List<ExerciseDto> toExerciseDtos(List<Exercise> exercises) {
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
                .name(exercise.getName())
                .sets(toSetDtos(exercise.getSets()))
                .build();
    }

    private List<ExerciseSetDto> toSetDtos(List<Set> sets) {
        if (sets == null) {
            return Collections.emptyList();
        }
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

    private List<Exercise> toExercises(List<ExerciseDto> exerciseDtos, Workout workout) {
        if (exerciseDtos == null) {
            return new ArrayList<>();
        }
        return exerciseDtos.stream()
                .map(exerciseDto -> toExercise(exerciseDto, workout))
                .toList();
    }

    private Exercise toExercise(ExerciseDto exerciseDto, Workout workout) {
        Exercise exercise = Exercise.builder()
                .name(exerciseDto.name())
                .workout(workout)
                .sets(new ArrayList<>())
                .build();

        List<Set> sets = toSets(exerciseDto.sets(), exercise);
        exercise.setSets(sets);
        return exercise;
    }

    private List<Set> toSets(List<ExerciseSetDto> setDtos, Exercise exercise) {
        if (setDtos == null) {
            return new ArrayList<>();
        }
        return setDtos.stream()
                .map(setDto -> Set.builder()
                        .reps(setDto.reps())
                        .weight(setDto.weight())
                        .restTime(setDto.restTime())
                        .exercise(exercise)
                        .build())
                .toList();
    }
}

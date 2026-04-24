package com.fitnesstracker.backend.mapper;

import com.fitnesstracker.backend.dto.ExerciseDto;
import com.fitnesstracker.backend.dto.ExerciseSetDto;
import com.fitnesstracker.backend.dto.WeeklyPlanDto;
import com.fitnesstracker.backend.dto.WorkoutTemplateDto;
import com.fitnesstracker.backend.model.TemplateExercise;
import com.fitnesstracker.backend.model.TemplateSet;
import com.fitnesstracker.backend.model.WeeklyPlan;
import com.fitnesstracker.backend.model.WorkoutTemplate;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class WorkoutTemplateMapper {

    public WorkoutTemplateDto toDto(WorkoutTemplate template) {
        return WorkoutTemplateDto.builder()
                .id(template.getId())
                .name(template.getName())
                .exercises(toExerciseDtos(template.getExercises()))
                .build();
    }

    public WorkoutTemplate toEntity(WorkoutTemplateDto templateDto) {
        WorkoutTemplate template = WorkoutTemplate.builder()
                .name(templateDto.name())
                .exercises(new LinkedHashSet<>())
                .build();

        Set<TemplateExercise> exercises = toExercises(templateDto.exercises(), template);
        template.setExercises(exercises);
        return template;
    }

    public WeeklyPlanDto toWeeklyPlanDto(WeeklyPlan weeklyPlan) {
        return WeeklyPlanDto.builder()
                .id(weeklyPlan.getId())
                .dayOfWeek(weeklyPlan.getDayOfWeek())
                .templateId(weeklyPlan.getTemplate().getId())
                .templateName(weeklyPlan.getTemplate().getName())
                .build();
    }

    private List<ExerciseDto> toExerciseDtos(Collection<TemplateExercise> exercises) {
        if (exercises == null) {
            return Collections.emptyList();
        }
        return exercises.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseDto toDto(TemplateExercise exercise) {
        return ExerciseDto.builder()
                .id(exercise.getId())
                .name(exercise.getName())
                .note(exercise.getNote())
                .sets(toSetDtos(exercise.getSets()))
                .build();
    }

    private List<ExerciseSetDto> toSetDtos(Collection<TemplateSet> sets) {
        if (sets == null) {
            return Collections.emptyList();
        }
        return sets.stream()
                .map(this::toDto)
                .toList();
    }

    private ExerciseSetDto toDto(TemplateSet set) {
        return ExerciseSetDto.builder()
                .id(set.getId())
                .reps(set.getReps())
                .weight(set.getWeight())
                .durationSeconds(set.getDurationSeconds())
                .build();
    }

    private Set<TemplateExercise> toExercises(List<ExerciseDto> exerciseDtos, WorkoutTemplate template) {
        if (exerciseDtos == null) {
            return new LinkedHashSet<>();
        }
        LinkedHashSet<TemplateExercise> exercises = new LinkedHashSet<>();
        for (int i = 0; i < exerciseDtos.size(); i++) {
            exercises.add(toExercise(exerciseDtos.get(i), template, i));
        }
        return exercises;
    }

    private TemplateExercise toExercise(ExerciseDto exerciseDto, WorkoutTemplate template, int position) {
        TemplateExercise exercise = TemplateExercise.builder()
                .name(exerciseDto.name())
                .note(exerciseDto.note())
                .position(position)
                .template(template)
                .sets(new LinkedHashSet<>())
                .build();

        Set<TemplateSet> sets = toSets(exerciseDto.sets(), exercise);
        exercise.setSets(sets);
        return exercise;
    }

    private Set<TemplateSet> toSets(List<ExerciseSetDto> setDtos, TemplateExercise exercise) {
        if (setDtos == null) {
            return new LinkedHashSet<>();
        }
        LinkedHashSet<TemplateSet> sets = new LinkedHashSet<>();
        for (int i = 0; i < setDtos.size(); i++) {
            ExerciseSetDto setDto = setDtos.get(i);
            sets.add(TemplateSet.builder()
                    .reps(setDto.reps())
                    .weight(setDto.weight())
                    .durationSeconds(setDto.durationSeconds())
                    .position(i)
                    .exercise(exercise)
                    .build());
        }
        return sets;
    }
}

package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.ExerciseCatalogDto;
import com.fitnesstracker.backend.model.Exercise;
import com.fitnesstracker.backend.model.ExerciseCatalog;
import com.fitnesstracker.backend.repository.ExerciseCatalogRepository;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExerciseCatalogService {

    private final ExerciseCatalogRepository exerciseCatalogRepository;

    @Transactional(readOnly = true)
    public List<ExerciseCatalogDto> search(String query, String muscleGroup, Integer limit) {
        int safeLimit = (limit == null || limit <= 0) ? 50 : Math.min(limit, 200);
        String normalizedQuery = (query == null || query.isBlank()) ? "" : query.trim();
        String normalizedMuscle = (muscleGroup == null || muscleGroup.isBlank()) ? null : muscleGroup.trim();

        List<ExerciseCatalog> items;
        if (normalizedMuscle != null && !normalizedQuery.isBlank()) {
            items = exerciseCatalogRepository.findAllByMuscleGroupAndNameContainingIgnoreCaseOrderByNameAsc(
                    normalizedMuscle,
                    normalizedQuery
            );
        } else if (normalizedMuscle != null) {
            items = exerciseCatalogRepository.findAllByMuscleGroupOrderByNameAsc(normalizedMuscle);
        } else if (!normalizedQuery.isBlank()) {
            items = exerciseCatalogRepository.findAllByNameContainingIgnoreCaseOrderByNameAsc(normalizedQuery);
        } else {
            items = exerciseCatalogRepository.findAllByOrderByNameAsc();
        }

        return items.stream()
                .limit(safeLimit)
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getMuscleGroups() {
        return exerciseCatalogRepository.findDistinctMuscleGroups();
    }

    public void attachCatalogToExercises(Iterable<Exercise> exercises) {
        exercises.forEach(this::attachCatalogToExercise);
    }

    private void attachCatalogToExercise(Exercise exercise) {
        String name = exercise.getName();
        if (name == null || name.isBlank()) {
            return;
        }
        String normalized = normalize(name);
        Optional<ExerciseCatalog> matched = exerciseCatalogRepository.findByNormalizedName(normalized);
        if (matched.isPresent()) {
            ExerciseCatalog catalog = matched.get();
            exercise.setCatalog(catalog);
            exercise.setName(catalog.getName());
        }
    }

    private ExerciseCatalogDto toDto(ExerciseCatalog entity) {
        return ExerciseCatalogDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .muscleGroup(entity.getMuscleGroup())
                .build();
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}

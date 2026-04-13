package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.ExerciseCatalog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseCatalogRepository extends JpaRepository<ExerciseCatalog, Long> {

    Optional<ExerciseCatalog> findByNormalizedName(String normalizedName);

    List<ExerciseCatalog> findAllByOrderByNameAsc();

    List<ExerciseCatalog> findAllByMuscleGroupOrderByNameAsc(String muscleGroup);

    List<ExerciseCatalog> findAllByNameContainingIgnoreCaseOrderByNameAsc(String query);

    List<ExerciseCatalog> findAllByMuscleGroupAndNameContainingIgnoreCaseOrderByNameAsc(
            String muscleGroup,
            String query
    );

    @Query("SELECT DISTINCT ec.muscleGroup FROM ExerciseCatalog ec ORDER BY ec.muscleGroup ASC")
    List<String> findDistinctMuscleGroups();
}

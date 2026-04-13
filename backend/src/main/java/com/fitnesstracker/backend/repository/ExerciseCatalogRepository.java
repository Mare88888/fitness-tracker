package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.ExerciseCatalog;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseCatalogRepository extends JpaRepository<ExerciseCatalog, Long> {

    Optional<ExerciseCatalog> findByNormalizedName(String normalizedName);

    @Query("""
            SELECT ec
            FROM ExerciseCatalog ec
            WHERE (:query IS NULL OR LOWER(ec.name) LIKE LOWER(CONCAT('%', :query, '%')))
              AND (:muscleGroup IS NULL OR ec.muscleGroup = :muscleGroup)
            ORDER BY ec.name ASC
            """)
    List<ExerciseCatalog> search(
            @Param("query") String query,
            @Param("muscleGroup") String muscleGroup
    );

    @Query("SELECT DISTINCT ec.muscleGroup FROM ExerciseCatalog ec ORDER BY ec.muscleGroup ASC")
    List<String> findDistinctMuscleGroups();
}

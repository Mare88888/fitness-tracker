package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.WorkoutTemplate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, Long> {

    @EntityGraph(attributePaths = {"exercises", "exercises.sets"})
    List<WorkoutTemplate> findAllByOwnerOrderByNameAsc(AppUser owner);

    @EntityGraph(attributePaths = {"exercises", "exercises.sets"})
    Optional<WorkoutTemplate> findByIdAndOwner(Long id, AppUser owner);
}

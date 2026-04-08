package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.Workout;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, Long> {

    @EntityGraph(attributePaths = {"exercises", "exercises.sets"})
    List<Workout> findAllWithDetailsBy();

    @EntityGraph(attributePaths = {"exercises", "exercises.sets"})
    Optional<Workout> findWithDetailsById(Long id);
}

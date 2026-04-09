package com.fitnesstracker.backend.repository;

import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.WeeklyPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WeeklyPlanRepository extends JpaRepository<WeeklyPlan, Long> {

    @EntityGraph(attributePaths = {"template"})
    List<WeeklyPlan> findAllByOwnerOrderByDayOfWeekAsc(AppUser owner);

    Optional<WeeklyPlan> findByOwnerAndDayOfWeek(AppUser owner, Integer dayOfWeek);
}

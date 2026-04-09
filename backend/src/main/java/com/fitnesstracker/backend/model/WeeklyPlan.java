package com.fitnesstracker.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "weekly_plan",
        uniqueConstraints = @UniqueConstraint(name = "uk_weekly_plan_owner_day", columnNames = {"user_id", "day_of_week"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer dayOfWeek;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser owner;

    @ManyToOne
    @JoinColumn(name = "template_id", nullable = false)
    private WorkoutTemplate template;
}

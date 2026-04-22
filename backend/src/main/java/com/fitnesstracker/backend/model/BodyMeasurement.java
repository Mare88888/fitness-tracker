package com.fitnesstracker.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "body_measurement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BodyMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    private Double weight;

    private Double waist;

    private Double chest;

    private Double leftArm;

    private Double rightArm;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser owner;
}

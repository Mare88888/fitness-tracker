package com.fitnesstracker.backend.model;

import jakarta.persistence.Column;
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
@Table(name = "progress_photo")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate capturedAt;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String imageDataUrl;

    @Column(length = 400)
    private String note;

    private LocalDate reminderDate;

    @ManyToOne
    @JoinColumn(name = "body_measurement_id")
    private BodyMeasurement linkedMeasurement;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser owner;
}

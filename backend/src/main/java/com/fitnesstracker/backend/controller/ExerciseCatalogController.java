package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.ExerciseCatalogDto;
import com.fitnesstracker.backend.service.ExerciseCatalogService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ExerciseCatalogController {

    private final ExerciseCatalogService exerciseCatalogService;

    @GetMapping("/exercise-catalog")
    public ResponseEntity<List<ExerciseCatalogDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(exerciseCatalogService.search(q, muscle, limit));
    }

    @GetMapping("/exercise-catalog/muscles")
    public ResponseEntity<List<String>> muscles() {
        return ResponseEntity.ok(exerciseCatalogService.getMuscleGroups());
    }
}

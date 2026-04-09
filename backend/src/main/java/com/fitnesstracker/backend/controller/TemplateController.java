package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.WeeklyPlanAssignmentRequest;
import com.fitnesstracker.backend.dto.WeeklyPlanDto;
import com.fitnesstracker.backend.dto.WorkoutTemplateDto;
import com.fitnesstracker.backend.service.WorkoutTemplateService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class TemplateController {

    private final WorkoutTemplateService workoutTemplateService;

    @GetMapping("/templates")
    public ResponseEntity<List<WorkoutTemplateDto>> getTemplates(Authentication authentication) {
        return ResponseEntity.ok(workoutTemplateService.getTemplates(authentication.getName()));
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<WorkoutTemplateDto> getTemplateById(@PathVariable Long id, Authentication authentication) {
        return workoutTemplateService.getTemplateById(id, authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<WorkoutTemplateDto> createTemplate(
            @Valid @RequestBody WorkoutTemplateDto templateDto,
            Authentication authentication
    ) {
        WorkoutTemplateDto created = workoutTemplateService.createTemplate(templateDto, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<WorkoutTemplateDto> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody WorkoutTemplateDto templateDto,
            Authentication authentication
    ) {
        return workoutTemplateService.updateTemplate(id, templateDto, authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/templates/from-workout/{workoutId}")
    public ResponseEntity<WorkoutTemplateDto> createTemplateFromWorkout(
            @PathVariable Long workoutId,
            @RequestParam(required = false) String name,
            Authentication authentication
    ) {
        return workoutTemplateService.createTemplateFromWorkout(workoutId, authentication.getName(), name)
                .map(template -> ResponseEntity.status(HttpStatus.CREATED).body(template))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id, Authentication authentication) {
        if (!workoutTemplateService.deleteTemplate(id, authentication.getName())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/weekly-plans")
    public ResponseEntity<List<WeeklyPlanDto>> getWeeklyPlan(Authentication authentication) {
        return ResponseEntity.ok(workoutTemplateService.getWeeklyPlan(authentication.getName()));
    }

    @PutMapping("/weekly-plans/{dayOfWeek}")
    public ResponseEntity<WeeklyPlanDto> assignTemplateToDay(
            @PathVariable Integer dayOfWeek,
            @Valid @RequestBody WeeklyPlanAssignmentRequest request,
            Authentication authentication
    ) {
        return workoutTemplateService.assignTemplateToDay(dayOfWeek, request, authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @GetMapping("/weekly-plans/days")
    public ResponseEntity<List<Map<String, Object>>> listDays() {
        List<Map<String, Object>> days = List.of(
                Map.of("value", 1, "label", "Monday"),
                Map.of("value", 2, "label", "Tuesday"),
                Map.of("value", 3, "label", "Wednesday"),
                Map.of("value", 4, "label", "Thursday"),
                Map.of("value", 5, "label", "Friday"),
                Map.of("value", 6, "label", "Saturday"),
                Map.of("value", 7, "label", "Sunday")
        );
        return ResponseEntity.ok(days);
    }
}

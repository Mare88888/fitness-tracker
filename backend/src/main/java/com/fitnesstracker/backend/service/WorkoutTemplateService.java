package com.fitnesstracker.backend.service;

import com.fitnesstracker.backend.dto.WeeklyPlanAssignmentRequest;
import com.fitnesstracker.backend.dto.WeeklyPlanDto;
import com.fitnesstracker.backend.dto.WorkoutDto;
import com.fitnesstracker.backend.dto.WorkoutTemplateDto;
import com.fitnesstracker.backend.mapper.WorkoutMapper;
import com.fitnesstracker.backend.mapper.WorkoutTemplateMapper;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.model.WeeklyPlan;
import com.fitnesstracker.backend.model.Workout;
import com.fitnesstracker.backend.model.WorkoutTemplate;
import com.fitnesstracker.backend.repository.AppUserRepository;
import com.fitnesstracker.backend.repository.WeeklyPlanRepository;
import com.fitnesstracker.backend.repository.WorkoutRepository;
import com.fitnesstracker.backend.repository.WorkoutTemplateRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkoutTemplateService {

    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;
    private final WorkoutRepository workoutRepository;
    private final AppUserRepository appUserRepository;
    private final WorkoutTemplateMapper workoutTemplateMapper;
    private final WorkoutMapper workoutMapper;

    @Transactional(readOnly = true)
    public List<WorkoutTemplateDto> getTemplates(String username) {
        AppUser user = getCurrentUser(username);
        return workoutTemplateRepository.findAllByOwnerOrderByNameAsc(user).stream()
                .map(workoutTemplateMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<WorkoutTemplateDto> getTemplateById(Long templateId, String username) {
        AppUser user = getCurrentUser(username);
        return workoutTemplateRepository.findByIdAndOwner(templateId, user)
                .map(workoutTemplateMapper::toDto);
    }

    @Transactional
    public WorkoutTemplateDto createTemplate(WorkoutTemplateDto templateDto, String username) {
        AppUser user = getCurrentUser(username);
        WorkoutTemplate template = workoutTemplateMapper.toEntity(templateDto);
        template.setOwner(user);
        WorkoutTemplate saved = workoutTemplateRepository.save(template);
        return workoutTemplateMapper.toDto(saved);
    }

    @Transactional
    public Optional<WorkoutTemplateDto> updateTemplate(Long templateId, WorkoutTemplateDto templateDto, String username) {
        AppUser user = getCurrentUser(username);
        Optional<WorkoutTemplate> existingOptional = workoutTemplateRepository.findByIdAndOwner(templateId, user);
        if (existingOptional.isEmpty()) {
            return Optional.empty();
        }

        WorkoutTemplate existing = existingOptional.get();
        WorkoutTemplate mappedTemplate = workoutTemplateMapper.toEntity(templateDto);

        existing.setName(mappedTemplate.getName());
        existing.getExercises().clear();
        mappedTemplate.getExercises().forEach(exercise -> {
            exercise.setTemplate(existing);
            existing.getExercises().add(exercise);
        });

        WorkoutTemplate saved = workoutTemplateRepository.save(existing);
        return Optional.of(workoutTemplateMapper.toDto(saved));
    }

    @Transactional
    public Optional<WorkoutTemplateDto> createTemplateFromWorkout(Long workoutId, String username, String templateName) {
        AppUser user = getCurrentUser(username);
        Optional<Workout> workoutOptional = workoutRepository.findWithDetailsByIdAndOwner(workoutId, user);
        if (workoutOptional.isEmpty()) {
            return Optional.empty();
        }
        WorkoutDto workoutDto = workoutMapper.toDto(workoutOptional.get());
        WorkoutTemplateDto templateDto = WorkoutTemplateDto.builder()
                .name(templateName != null && !templateName.isBlank() ? templateName.trim() : workoutDto.name())
                .exercises(workoutDto.exercises())
                .build();
        return Optional.of(createTemplate(templateDto, username));
    }

    @Transactional
    public boolean deleteTemplate(Long templateId, String username) {
        AppUser user = getCurrentUser(username);
        Optional<WorkoutTemplate> templateOptional = workoutTemplateRepository.findByIdAndOwner(templateId, user);
        if (templateOptional.isEmpty()) {
            return false;
        }
        workoutTemplateRepository.delete(templateOptional.get());
        return true;
    }

    @Transactional(readOnly = true)
    public List<WeeklyPlanDto> getWeeklyPlan(String username) {
        AppUser user = getCurrentUser(username);
        return weeklyPlanRepository.findAllByOwnerOrderByDayOfWeekAsc(user).stream()
                .map(workoutTemplateMapper::toWeeklyPlanDto)
                .toList();
    }

    @Transactional
    public Optional<WeeklyPlanDto> assignTemplateToDay(Integer dayOfWeek, WeeklyPlanAssignmentRequest request, String username) {
        if (dayOfWeek == null || dayOfWeek < 1 || dayOfWeek > 7) {
            throw new IllegalArgumentException("dayOfWeek must be between 1 and 7.");
        }
        AppUser user = getCurrentUser(username);
        Optional<WorkoutTemplate> templateOptional = workoutTemplateRepository.findByIdAndOwner(request.templateId(), user);
        if (templateOptional.isEmpty()) {
            return Optional.empty();
        }

        WeeklyPlan weeklyPlan = weeklyPlanRepository.findByOwnerAndDayOfWeek(user, dayOfWeek)
                .orElseGet(() -> WeeklyPlan.builder()
                        .owner(user)
                        .dayOfWeek(dayOfWeek)
                        .build());
        weeklyPlan.setTemplate(templateOptional.get());
        WeeklyPlan saved = weeklyPlanRepository.save(weeklyPlan);
        return Optional.of(workoutTemplateMapper.toWeeklyPlanDto(saved));
    }

    private AppUser getCurrentUser(String username) {
        return appUserRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found."));
    }
}

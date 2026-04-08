package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.service.HealthService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping
    public Map<String, String> healthCheck() {
        return healthService.healthCheck();
    }
}

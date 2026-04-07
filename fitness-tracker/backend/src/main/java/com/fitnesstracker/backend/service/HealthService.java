package com.fitnesstracker.backend.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public Map<String, String> healthCheck() {
        return Map.of("status", "UP");
    }
}

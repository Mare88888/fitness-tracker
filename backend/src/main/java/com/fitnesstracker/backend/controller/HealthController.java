package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.service.HealthService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;
    @Value("${app.auth.access-cookie-name}")
    private String accessCookieName;
    @Value("${app.auth.refresh-cookie-name}")
    private String refreshCookieName;
    @Value("${app.auth.cookie-secure}")
    private boolean cookieSecure;
    @Value("${app.auth.cookie-same-site}")
    private String cookieSameSite;
    @Value("${app.auth.refresh-cleanup-ms}")
    private long refreshCleanupMs;

    @GetMapping
    public Map<String, String> healthCheck() {
        return healthService.healthCheck();
    }

    @GetMapping("/security")
    public Map<String, Object> securityHealth() {
        return Map.of(
                "status", "ok",
                "csrfEnabled", true,
                "csrfCookieName", "XSRF-TOKEN",
                "csrfHeaderName", "X-XSRF-TOKEN",
                "accessCookieName", accessCookieName,
                "refreshCookieName", refreshCookieName,
                "cookieSecure", cookieSecure,
                "cookieSameSite", cookieSameSite,
                "refreshCleanupMs", refreshCleanupMs
        );
    }
}

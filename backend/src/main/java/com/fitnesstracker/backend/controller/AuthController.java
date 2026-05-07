package com.fitnesstracker.backend.controller;

import com.fitnesstracker.backend.dto.AuthResponse;
import com.fitnesstracker.backend.dto.LoginRequest;
import com.fitnesstracker.backend.dto.RegisterRequest;
import com.fitnesstracker.backend.model.AppUser;
import com.fitnesstracker.backend.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    @Value("${app.auth.access-cookie-name}")
    private String accessCookieName;
    @Value("${app.auth.refresh-cookie-name}")
    private String refreshCookieName;
    @Value("${app.jwt.expiration-ms}")
    private long accessExpirationMs;
    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;
    @Value("${app.auth.cookie-secure}")
    private boolean secureCookies;
    @Value("${app.auth.cookie-same-site}")
    private String sameSite;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response
    ) {
        AuthResponse registerResponse = authService.register(request);
        AppUser user = authService.getUserByUsername(registerResponse.username());
        attachAuthCookies(response, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(registerResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpServletRequest,
            HttpServletResponse response
    ) {
        AuthResponse loginResponse = authService.login(request, resolveClientKey(httpServletRequest));
        AppUser user = authService.getUserByUsername(loginResponse.username());
        attachAuthCookies(response, user);
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readCookie(request, refreshCookieName);
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AppUser user = authService.validateRefreshTokenAndGetUser(refreshToken);
        attachAuthCookies(response, user);
        return ResponseEntity.ok(new AuthResponse(user.getUsername()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication, HttpServletResponse response) {
        if (authentication != null) {
            AppUser user = authService.getUserByUsername(authentication.getName());
            authService.revokeRefreshTokensForUser(user);
        }
        clearAuthCookies(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken csrfToken) {
        return ResponseEntity.ok(Map.of("token", csrfToken.getToken()));
    }

    private void attachAuthCookies(HttpServletResponse response, AppUser user) {
        String accessToken = authService.issueAccessToken(user);
        String refreshToken = authService.issueRefreshToken(user);

        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(accessCookieName, accessToken, accessExpirationMs));
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(refreshCookieName, refreshToken, refreshExpirationMs));
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(accessCookieName, "", 0));
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(refreshCookieName, "", 0));
    }

    private String buildCookie(String name, String value, long maxAgeMillis) {
        long maxAgeSeconds = Math.max(0, maxAgeMillis / 1000);
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build()
                .toString();
    }

    private String readCookie(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] parts = forwardedFor.split(",");
            if (parts.length > 0 && !parts[0].isBlank()) {
                return parts[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}

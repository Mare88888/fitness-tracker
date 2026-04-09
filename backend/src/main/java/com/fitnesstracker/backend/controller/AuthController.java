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
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
            HttpServletResponse response
    ) {
        AuthResponse loginResponse = authService.login(request);
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

    private void attachAuthCookies(HttpServletResponse response, AppUser user) {
        String accessToken = authService.issueAccessToken(user);
        String refreshToken = authService.issueRefreshToken(user);

        response.addCookie(buildCookie(accessCookieName, accessToken, (int) (accessExpirationMs / 1000)));
        response.addCookie(buildCookie(refreshCookieName, refreshToken, (int) (refreshExpirationMs / 1000)));
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addCookie(buildCookie(accessCookieName, "", 0));
        response.addCookie(buildCookie(refreshCookieName, "", 0));
    }

    private Cookie buildCookie(String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);
        return cookie;
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
}

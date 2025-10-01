package com.app.taskmanagement.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@Slf4j
public class TestController {

    /**
     * Public endpoint - No authentication required
     * Test basic connectivity
     */
    @GetMapping("/hello")
    public ResponseEntity<Map<String, Object>> hello() {
        log.info("Test endpoint /hello called");

        return ResponseEntity.ok(Map.of(
                "message", "Hello World from Spring Boot!",
                "timestamp", LocalDateTime.now().toString(),
                "status", "SUCCESS"
        ));
    }

    /**
     * Protected endpoint - Requires authentication
     * Test JWT authentication
     */
    @GetMapping("/secure")
    public ResponseEntity<Map<String, Object>> secureHello() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "Anonymous";

        log.info("Secure test endpoint called by user: {}", username);

        return ResponseEntity.ok(Map.of(
                "message", "Hello " + username + "! You are authenticated!",
                "timestamp", LocalDateTime.now().toString(),
                "status", "SUCCESS",
                "user", username
        ));
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "backend", "Spring Boot 3.4.10",
                "java", System.getProperty("java.version"),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    /**
     * Echo endpoint - Returns what you send
     */
    @PostMapping("/echo")
    public ResponseEntity<Map<String, Object>> echo(@RequestBody Map<String, Object> payload) {
        log.info("Echo endpoint called with payload: {}", payload);

        return ResponseEntity.ok(Map.of(
                "message", "Echo successful",
                "receivedData", payload,
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
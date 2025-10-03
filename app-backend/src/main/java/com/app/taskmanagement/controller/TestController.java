package com.app.taskmanagement.controller;

import com.app.taskmanagement.constant.ApiPath;
import com.app.taskmanagement.dto.response.ApiResponse;
import com.app.taskmanagement.model.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping(ApiPath.Test.BASE)
@Slf4j
public class TestController {

    @GetMapping(ApiPath.Test.HELLO)
    public ResponseEntity<ApiResponse<Map<String, Object>>> hello() {
        Map<String, Object> data = Map.of(
                "message", "Hello World from Spring Boot!",
                "timestamp", LocalDateTime.now().toString(),
                "status", "SUCCESS"
        );
        return ResponseEntity.ok(ApiResponse.success("Request successful", data));
    }

    @GetMapping(ApiPath.Test.SECURE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> secureHello() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = "";
        if (auth.getPrincipal() instanceof User) {
            username = ((User) auth.getPrincipal()).getFullName();
        } else {
            username = auth != null ? auth.getName() : "Anonymous";
        }

        Map<String, Object> data = Map.of(
                "message", "Hello " + username + "! You are authenticated!",
                "timestamp", LocalDateTime.now().toString(),
                "status", "SUCCESS",
                "user", username
        );
        return ResponseEntity.ok(ApiResponse.success("Authenticated request successful", data));
    }

    @GetMapping(ApiPath.Test.HEALTH)
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> data = Map.of(
                "status", "UP",
                "backend", "Spring Boot 3.4.10",
                "java", System.getProperty("java.version"),
                "timestamp", LocalDateTime.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success("Service is healthy", data));
    }

    @PostMapping(ApiPath.Test.ECHO)
    public ResponseEntity<ApiResponse<Map<String, Object>>> echo(@RequestBody Map<String, Object> payload) {
        Map<String, Object> data = Map.of(
                "message", "Echo successful",
                "receivedData", payload,
                "timestamp", LocalDateTime.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success("Echo successful", data));
    }
}

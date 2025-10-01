package com.app.taskmanagement.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Facebook Login Request
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacebookLoginRequest {
    @NotBlank(message = "Access token is required")
    private String accessToken;
}

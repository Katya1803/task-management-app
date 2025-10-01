package com.app.taskmanagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Link Email Request (for Facebook without email)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkEmailRequest {
    @NotBlank(message = "Provider ID is required")
    private String providerId;

    @NotBlank(message = "Provider is required")
    private String provider; // GOOGLE or FACEBOOK

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
}

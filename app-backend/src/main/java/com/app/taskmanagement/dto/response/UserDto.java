package com.app.taskmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// User DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private String publicId;
    private String email;
    private String fullName;
    private String role;
    private String authProvider;
    private Boolean emailVerified;
}

package com.app.taskmanagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// OAuth2 User Info (internal use)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuth2UserInfo {
    private String providerId;
    private String email;
    private String fullName;
    private Boolean emailVerified;
    private String provider; // GOOGLE or FACEBOOK
}

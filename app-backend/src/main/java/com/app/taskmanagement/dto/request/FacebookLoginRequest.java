package com.app.taskmanagement.dto.request;

import com.app.taskmanagement.constant.ValidationMessages;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacebookLoginRequest {

    @NotBlank(message = ValidationMessages.TOKEN_REQUIRED)
    private String accessToken;
}
package com.app.taskmanagement.dto.request;

import com.app.taskmanagement.constant.ValidationMessages;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = ValidationMessages.EMAIL_REQUIRED)
    @Email(message = ValidationMessages.EMAIL_INVALID)
    private String email;

    @NotBlank(message = ValidationMessages.PASSWORD_REQUIRED)
    @Size(min = ValidationMessages.PASSWORD_MIN_LENGTH, message = ValidationMessages.PASSWORD_MIN_LENGTH_MSG)
    private String password;

    @NotBlank(message = ValidationMessages.FULLNAME_REQUIRED)
    @Size(min = ValidationMessages.FULLNAME_MIN_LENGTH, max = ValidationMessages.FULLNAME_MAX_LENGTH,
            message = ValidationMessages.FULLNAME_LENGTH_MSG)
    private String fullName;
}
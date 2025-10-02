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
public class VerifyOtpRequest {

    @NotBlank(message = ValidationMessages.EMAIL_REQUIRED)
    @Email(message = ValidationMessages.EMAIL_INVALID)
    private String email;

    @NotBlank(message = ValidationMessages.OTP_REQUIRED)
    @Size(min = ValidationMessages.OTP_EXACT_LENGTH, max = ValidationMessages.OTP_EXACT_LENGTH,
            message = ValidationMessages.OTP_LENGTH_MSG)
    private String otp;
}
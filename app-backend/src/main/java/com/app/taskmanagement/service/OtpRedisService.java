package com.app.taskmanagement.service;

import com.app.taskmanagement.constant.ErrorCode;
import com.app.taskmanagement.constant.SecurityConstants;
import com.app.taskmanagement.constant.TimeConstants;
import com.app.taskmanagement.exception.ApplicationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpRedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generateAndSaveOtp(String email) {
        String attemptsKey = SecurityConstants.OTP_ATTEMPTS_PREFIX + email;

        Integer attempts = (Integer) redisTemplate.opsForValue().get(attemptsKey);
        if (attempts != null && attempts >= SecurityConstants.MAX_OTP_ATTEMPTS) {
            throw new ApplicationException(ErrorCode.TOO_MANY_OTP_ATTEMPTS);
        }

        String otp = generateOtp();
        String otpKey = SecurityConstants.OTP_PREFIX + email;

        redisTemplate.opsForValue().set(
                otpKey,
                otp,
                TimeConstants.OTP_EXPIRATION_MINUTES,
                TimeUnit.MINUTES
        );

        if (attempts == null) {
            redisTemplate.opsForValue().set(
                    attemptsKey,
                    1,
                    SecurityConstants.OTP_RATE_LIMIT_WINDOW_MINUTES,
                    TimeUnit.MINUTES
            );
        } else {
            redisTemplate.opsForValue().increment(attemptsKey);
        }

        log.info("OTP generated for: {}", email);
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        String otpKey = SecurityConstants.OTP_PREFIX + email;
        String storedOtp = (String) redisTemplate.opsForValue().get(otpKey);

        if (storedOtp == null || !storedOtp.equals(otp)) {
            return false;
        }

        redisTemplate.delete(otpKey);
        redisTemplate.delete(SecurityConstants.OTP_ATTEMPTS_PREFIX + email);

        log.info("OTP verified successfully for: {}", email);
        return true;
    }

    private String generateOtp() {
        int min = (int) Math.pow(10, TimeConstants.OTP_LENGTH - 1);
        int max = (int) Math.pow(10, TimeConstants.OTP_LENGTH) - 1;
        int otp = RANDOM.nextInt(max - min + 1) + min;
        return String.valueOf(otp);
    }
}
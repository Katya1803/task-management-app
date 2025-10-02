// src/main/java/com/app/taskmanagement/service/OtpRedisService.java
package com.app.taskmanagement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpRedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SecureRandom random = new SecureRandom();

    @Value("${otp.expiration}")
    private Long otpExpiration; // 300000ms = 5 minutes

    @Value("${otp.length}")
    private Integer otpLength; // 6

    private static final String OTP_PREFIX = "otp:";
    private static final String OTP_ATTEMPTS_PREFIX = "otp_attempts:";
    private static final String OTP_RATE_LIMIT_PREFIX = "otp_rate:";
    private static final int MAX_ATTEMPTS = 5;
    private static final int RATE_LIMIT_WINDOW = 15; // minutes
    private static final int MAX_OTP_REQUESTS = 3;

    /**
     * Generate and store OTP in Redis
     */
    public String generateAndSaveOtp(String email) {
        // 1. Check rate limiting (max 3 OTPs per 15 minutes)
        if (!checkRateLimit(email)) {
            throw new RuntimeException("Too many OTP requests. Please wait 15 minutes.");
        }

        // 2. Generate OTP
        String otp = generateOtp();
        String key = OTP_PREFIX + email;

        // 3. Store OTP data in Redis Hash
        Map<String, Object> otpData = new HashMap<>();
        otpData.put("code", otp);
        otpData.put("attempts", 0);
        otpData.put("createdAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, otpData);

        // 4. Set TTL (auto-expiration after 5 minutes)
        redisTemplate.expire(key, otpExpiration, TimeUnit.MILLISECONDS);

        // 5. Increment rate limit counter
        incrementRateLimit(email);

        log.info("✅ OTP generated and stored in Redis: {} (expires in {}ms)",
                email, otpExpiration);

        return otp;
    }

    /**
     * Verify OTP
     */
    public boolean verifyOtp(String email, String inputOtp) {
        String key = OTP_PREFIX + email;

        // 1. Check if OTP exists
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            log.warn("❌ OTP not found or expired: {}", email);
            return false;
        }

        // 2. Get OTP data
        Map<Object, Object> otpData = redisTemplate.opsForHash().entries(key);
        String storedOtp = (String) otpData.get("code");
        Integer attempts = (Integer) otpData.get("attempts");

        // 3. Check max attempts
        if (attempts != null && attempts >= MAX_ATTEMPTS) {
            log.warn("❌ Max OTP attempts reached: {}", email);
            redisTemplate.delete(key); // Delete to prevent further attempts
            return false;
        }

        // 4. Verify OTP
        if (storedOtp != null && storedOtp.equals(inputOtp)) {
            // Success - delete OTP (one-time use)
            redisTemplate.delete(key);
            log.info("✅ OTP verified successfully: {}", email);
            return true;
        } else {
            // Failed - increment attempts
            redisTemplate.opsForHash().increment(key, "attempts", 1);
            log.warn("❌ Invalid OTP attempt: {} (attempt #{})", email, attempts + 1);
            return false;
        }
    }

    /**
     * Invalidate OTP (when user requests new one)
     */
    public void invalidateOtp(String email) {
        String key = OTP_PREFIX + email;
        redisTemplate.delete(key);
        log.info("🗑️ OTP invalidated: {}", email);
    }

    /**
     * Check rate limiting
     */
    private boolean checkRateLimit(String email) {
        String key = OTP_RATE_LIMIT_PREFIX + email;
        Integer count = (Integer) redisTemplate.opsForValue().get(key);
        return count == null || count < MAX_OTP_REQUESTS;
    }

    /**
     * Increment rate limit counter
     */
    private void incrementRateLimit(String email) {
        String key = OTP_RATE_LIMIT_PREFIX + email;
        Long count = redisTemplate.opsForValue().increment(key);

        // Set expiration on first request
        if (count != null && count == 1) {
            redisTemplate.expire(key, RATE_LIMIT_WINDOW, TimeUnit.MINUTES);
        }
    }

    /**
     * Generate random 6-digit OTP
     */
    private String generateOtp() {
        int min = (int) Math.pow(10, otpLength - 1);
        int max = (int) Math.pow(10, otpLength) - 1;
        int otp = min + random.nextInt(max - min + 1);
        return String.valueOf(otp);
    }

    /**
     * Get remaining attempts for debugging
     */
    public int getRemainingAttempts(String email) {
        String key = OTP_PREFIX + email;
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            return 0;
        }
        Integer attempts = (Integer) redisTemplate.opsForHash().get(key, "attempts");
        return MAX_ATTEMPTS - (attempts != null ? attempts : 0);
    }
}
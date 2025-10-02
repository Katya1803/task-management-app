// src/main/java/com/app/taskmanagement/service/RefreshTokenRedisService.java
package com.app.taskmanagement.service;

import com.app.taskmanagement.model.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenRedisService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration; // 604800000ms = 7 days

    private static final String REFRESH_TOKEN_PREFIX = "refresh:";
    private static final String USER_TOKENS_PREFIX = "user_tokens:";

    /**
     * Create refresh token in Redis
     */
    public String createRefreshToken(User user, HttpServletRequest request) {
        String token = UUID.randomUUID().toString();
        String key = REFRESH_TOKEN_PREFIX + token;
        String deviceId = extractDeviceId(request);

        // Check and revoke existing token for this device
        revokeTokenByDeviceId(user.getId(), deviceId);

        // Store token data in Redis Hash
        Map<String, Object> tokenData = new HashMap<>();
        tokenData.put("userId", user.getId().toString());
        tokenData.put("email", user.getEmail());
        tokenData.put("deviceId", deviceId);
        tokenData.put("ipAddress", extractIpAddress(request));
        tokenData.put("userAgent", extractUserAgent(request));
        tokenData.put("createdAt", LocalDateTime.now().toString());

        // Save token data
        redisTemplate.opsForHash().putAll(key, tokenData);

        // Set TTL (auto-expiration after 7 days)
        redisTemplate.expire(key, refreshTokenExpiration, TimeUnit.MILLISECONDS);

        // Track user's active tokens
        String userTokensKey = USER_TOKENS_PREFIX + user.getId();
        redisTemplate.opsForSet().add(userTokensKey, token);
        redisTemplate.expire(userTokensKey, refreshTokenExpiration, TimeUnit.MILLISECONDS);

        log.info("✅ Refresh token created in Redis: {} (user: {}, device: {})",
                token, user.getId(), deviceId);

        return token;
    }

    /**
     * Validate refresh token and return user ID
     */
    public Long validateAndGetUserId(String token) {
        String key = REFRESH_TOKEN_PREFIX + token;

        // Check if token exists
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
            log.warn("❌ Refresh token not found or expired: {}", token);
            return null;
        }

        // Get user ID
        String userIdStr = (String) redisTemplate.opsForHash().get(key, "userId");

        if (userIdStr == null) {
            log.warn("❌ Invalid refresh token data: {}", token);
            return null;
        }

        log.debug("✅ Refresh token validated: {}", token);
        return Long.parseLong(userIdStr);
    }

    /**
     * Get token metadata
     */
    public Map<Object, Object> getTokenData(String token) {
        String key = REFRESH_TOKEN_PREFIX + token;
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * Rotate refresh token (revoke old, create new)
     */
    public String rotateRefreshToken(String oldToken, User user, HttpServletRequest request) {
        // Revoke old token
        revokeToken(oldToken);

        // Create new token
        return createRefreshToken(user, request);
    }

    /**
     * Revoke single refresh token
     */
    public void revokeToken(String token) {
        String key = REFRESH_TOKEN_PREFIX + token;

        // Get userId before deleting
        String userIdStr = (String) redisTemplate.opsForHash().get(key, "userId");

        // Delete token
        redisTemplate.delete(key);

        // Remove from user's token set
        if (userIdStr != null) {
            String userTokensKey = USER_TOKENS_PREFIX + userIdStr;
            redisTemplate.opsForSet().remove(userTokensKey, token);
        }

        log.info("🗑️ Refresh token revoked: {}", token);
    }

    /**
     * Revoke all refresh tokens for user
     */
    public void revokeAllUserTokens(Long userId) {
        String userTokensKey = USER_TOKENS_PREFIX + userId;

        // Get all user's tokens
        Set<Object> tokens = redisTemplate.opsForSet().members(userTokensKey);

        if (tokens != null && !tokens.isEmpty()) {
            // Delete each token
            tokens.forEach(token -> {
                String key = REFRESH_TOKEN_PREFIX + token;
                redisTemplate.delete(key);
            });

            // Delete user tokens set
            redisTemplate.delete(userTokensKey);

            log.info("🗑️ All refresh tokens revoked for user: {} (count: {})",
                    userId, tokens.size());
        }
    }

    /**
     * Revoke token by device ID
     */
    private void revokeTokenByDeviceId(Long userId, String deviceId) {
        String userTokensKey = USER_TOKENS_PREFIX + userId;
        Set<Object> tokens = redisTemplate.opsForSet().members(userTokensKey);

        if (tokens != null) {
            tokens.forEach(token -> {
                String key = REFRESH_TOKEN_PREFIX + token;
                String tokenDeviceId = (String) redisTemplate.opsForHash().get(key, "deviceId");

                if (deviceId.equals(tokenDeviceId)) {
                    redisTemplate.delete(key);
                    redisTemplate.opsForSet().remove(userTokensKey, token);
                    log.info("🗑️ Previous token revoked for device: {}", deviceId);
                }
            });
        }
    }

    /**
     * Get active tokens count for user
     */
    public long getActiveTokensCount(Long userId) {
        String userTokensKey = USER_TOKENS_PREFIX + userId;
        Long count = redisTemplate.opsForSet().size(userTokensKey);
        return count != null ? count : 0;
    }

    /**
     * Get all active tokens for user (for device management)
     */
    public Set<Object> getUserActiveTokens(Long userId) {
        String userTokensKey = USER_TOKENS_PREFIX + userId;
        return redisTemplate.opsForSet().members(userTokensKey);
    }

    // ==================== HELPER METHODS ====================

    private String extractDeviceId(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return userAgent != null ? String.valueOf(userAgent.hashCode()) : "unknown";
    }

    private String extractIpAddress(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractUserAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return userAgent != null ? userAgent : "Unknown";
    }
}
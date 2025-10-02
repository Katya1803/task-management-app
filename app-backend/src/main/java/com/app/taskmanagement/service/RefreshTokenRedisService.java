package com.app.taskmanagement.service;

import com.app.taskmanagement.constant.SecurityConstants;
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
    private Long refreshTokenExpiration;

    public String createRefreshToken(User user, HttpServletRequest request) {
        String token = UUID.randomUUID().toString();
        String key = SecurityConstants.REFRESH_TOKEN_PREFIX + token;
        String deviceId = extractDeviceId(request);

        revokeTokenByDeviceId(user.getId(), deviceId);

        Map<String, Object> tokenData = new HashMap<>();
        tokenData.put("userId", user.getId());
        tokenData.put("email", user.getEmail());
        tokenData.put("deviceId", deviceId);
        tokenData.put("createdAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, tokenData);
        redisTemplate.expire(key, refreshTokenExpiration, TimeUnit.MILLISECONDS);

        String userTokensKey = SecurityConstants.USER_TOKENS_PREFIX + user.getId();
        redisTemplate.opsForSet().add(userTokensKey, token);

        log.info("Refresh token created for user: {}", user.getEmail());
        return token;
    }

    public Map<String, Object> getRefreshTokenData(String token) {
        String key = SecurityConstants.REFRESH_TOKEN_PREFIX + token;
        Map<Object, Object> rawData = redisTemplate.opsForHash().entries(key);

        if (rawData.isEmpty()) {
            return null;
        }

        Map<String, Object> tokenData = new HashMap<>();
        rawData.forEach((k, v) -> tokenData.put(k.toString(), v));
        return tokenData;
    }

    public void revokeToken(String token) {
        String key = SecurityConstants.REFRESH_TOKEN_PREFIX + token;
        Map<String, Object> tokenData = getRefreshTokenData(token);

        if (tokenData != null) {
            Object userIdObj = tokenData.get("userId");
            if (userIdObj != null) {
                long userId = Long.parseLong(userIdObj.toString());
                String userTokensKey = SecurityConstants.USER_TOKENS_PREFIX + userId;
                redisTemplate.opsForSet().remove(userTokensKey, token);
            }
        }

        redisTemplate.delete(key);
        log.info("Refresh token revoked");
    }

    public void revokeAllUserTokens(Long userId) {
        String userTokensKey = SecurityConstants.USER_TOKENS_PREFIX + userId;
        Set<Object> tokens = redisTemplate.opsForSet().members(userTokensKey);

        if (tokens != null) {
            tokens.forEach(token -> {
                String key = SecurityConstants.REFRESH_TOKEN_PREFIX + token.toString();
                redisTemplate.delete(key);
            });
        }

        redisTemplate.delete(userTokensKey);
        log.info("All refresh tokens revoked for user: {}", userId);
    }

    private void revokeTokenByDeviceId(Long userId, String deviceId) {
        String userTokensKey = SecurityConstants.USER_TOKENS_PREFIX + userId;
        Set<Object> tokens = redisTemplate.opsForSet().members(userTokensKey);

        if (tokens != null) {
            tokens.forEach(token -> {
                Map<String, Object> tokenData = getRefreshTokenData(token.toString());
                if (tokenData != null && deviceId.equals(tokenData.get("deviceId"))) {
                    revokeToken(token.toString());
                }
            });
        }
    }

    private String extractDeviceId(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        String ipAddress = request.getRemoteAddr();
        return (userAgent != null ? userAgent : "unknown") + "_" + (ipAddress != null ? ipAddress : "unknown");
    }
}
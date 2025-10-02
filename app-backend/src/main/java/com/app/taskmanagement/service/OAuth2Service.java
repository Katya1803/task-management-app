package com.app.taskmanagement.service;

import com.app.taskmanagement.constant.ErrorCode;
import com.app.taskmanagement.constant.SecurityConstants;
import com.app.taskmanagement.dto.response.AuthResponse;
import com.app.taskmanagement.dto.response.OAuth2UserInfo;
import com.app.taskmanagement.dto.response.UserDto;
import com.app.taskmanagement.exception.ApplicationException;
import com.app.taskmanagement.mapper.AuthMapper;
import com.app.taskmanagement.mapper.UserMapper;
import com.app.taskmanagement.model.User;
import com.app.taskmanagement.repository.UserRepository;
import com.app.taskmanagement.security.JwtUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2Service {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final UserMapper userMapper;
    private final AuthMapper authMapper;

    @Value("${oauth2.google.client-id}")
    private String googleClientId;

    @Value("${oauth2.facebook.app-id}")
    private String facebookAppId;

    @Value("${oauth2.facebook.app-secret}")
    private String facebookAppSecret;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Value("${oauth2.allow-account-linking}")
    private Boolean allowAccountLinking;

    private final WebClient webClient = WebClient.builder().build();

    @Transactional
    public AuthResponse loginWithGoogle(String idToken, HttpServletRequest request, HttpServletResponse response) {
        OAuth2UserInfo userInfo = verifyGoogleIdToken(idToken);
        return processOAuth2Login(userInfo, User.AuthProvider.GOOGLE, request, response);
    }

    @Transactional
    public AuthResponse loginWithFacebook(String accessToken, HttpServletRequest request, HttpServletResponse response) {
        OAuth2UserInfo userInfo = verifyFacebookAccessToken(accessToken);
        return processOAuth2Login(userInfo, User.AuthProvider.FACEBOOK, request, response);
    }

    @Transactional
    public AuthResponse linkEmailToProvider(String providerId, String provider, String email,
                                            HttpServletRequest request, HttpServletResponse response) {
        User.AuthProvider authProvider = User.AuthProvider.valueOf(provider.toUpperCase());

        User user = User.builder()
                .email(email)
                .fullName(email.split("@")[0])
                .role(User.Role.USER)
                .authProvider(authProvider)
                .providerId(providerId)
                .emailVerified(true)
                .isActive(true)
                .mfaEnabled(false)
                .build();

        userRepository.save(user);
        log.info("Email linked to {} provider: {}", provider, email);

        return generateAuthResponse(user, request, response);
    }

    private AuthResponse processOAuth2Login(OAuth2UserInfo userInfo, User.AuthProvider provider,
                                            HttpServletRequest request, HttpServletResponse response) {
        Optional<User> existingUser = userRepository.findByProviderAndProviderId(provider, userInfo.getProviderId());

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("OAuth2 user logged in: {}", user.getEmail());
            return generateAuthResponse(user, request, response);
        }

        if (userInfo.getEmail() == null) {
            throw new ApplicationException(ErrorCode.EMAIL_REQUIRED_FOR_OAUTH);
        }

        Optional<User> userByEmail = userRepository.findByEmail(userInfo.getEmail());

        if (userByEmail.isPresent() && !allowAccountLinking) {
            throw new ApplicationException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        if (userByEmail.isPresent()) {
            User user = userByEmail.get();
            user.setProviderId(userInfo.getProviderId());
            user.setAuthProvider(provider);
            user.setEmailVerified(userInfo.getEmailVerified());
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("Account linked for existing user: {}", user.getEmail());
            return generateAuthResponse(user, request, response);
        }

        User newUser = User.builder()
                .email(userInfo.getEmail())
                .fullName(userInfo.getFullName())
                .role(User.Role.USER)
                .authProvider(provider)
                .providerId(userInfo.getProviderId())
                .emailVerified(userInfo.getEmailVerified())
                .isActive(true)
                .mfaEnabled(false)
                .build();

        userRepository.save(newUser);
        log.info("New OAuth2 user created: {}", newUser.getEmail());

        return generateAuthResponse(newUser, request, response);
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest request, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = refreshTokenRedisService.createRefreshToken(user, request);

        Cookie cookie = new Cookie(SecurityConstants.REFRESH_TOKEN_COOKIE, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath(SecurityConstants.COOKIE_PATH);
        cookie.setMaxAge(SecurityConstants.COOKIE_MAX_AGE_SECONDS);
        response.addCookie(cookie);

        UserDto userDto = userMapper.toDto(user);
        return authMapper.toAuthResponse(accessToken, accessTokenExpiration, userDto);
    }

    private OAuth2UserInfo verifyGoogleIdToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    new GsonFactory()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);

            if (googleIdToken == null) {
                throw new ApplicationException(ErrorCode.OAUTH2_VERIFICATION_FAILED);
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();

            return OAuth2UserInfo.builder()
                    .providerId(payload.getSubject())
                    .email(payload.getEmail())
                    .fullName((String) payload.get("name"))
                    .emailVerified(payload.getEmailVerified())
                    .build();

        } catch (ApplicationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify Google ID token", e);
            throw new ApplicationException(ErrorCode.OAUTH2_VERIFICATION_FAILED);
        }
    }

    private OAuth2UserInfo verifyFacebookAccessToken(String accessToken) {
        try {
            String url = String.format(
                    SecurityConstants.FACEBOOK_USER_INFO_URL,
                    accessToken
            );

            Map<String, Object> userInfo = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (userInfo == null) {
                throw new ApplicationException(ErrorCode.OAUTH2_VERIFICATION_FAILED);
            }

            String debugUrl = String.format(
                    SecurityConstants.FACEBOOK_DEBUG_TOKEN_URL,
                    accessToken, facebookAppId, facebookAppSecret
            );

            Map<String, Object> debugResponse = webClient.get()
                    .uri(debugUrl)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (debugResponse == null) {
                throw new ApplicationException(ErrorCode.OAUTH2_VERIFICATION_FAILED);
            }

            return OAuth2UserInfo.builder()
                    .providerId((String) userInfo.get("id"))
                    .email((String) userInfo.get("email"))
                    .fullName((String) userInfo.get("name"))
                    .emailVerified(true)
                    .build();

        } catch (ApplicationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify Facebook access token", e);
            throw new ApplicationException(ErrorCode.OAUTH2_VERIFICATION_FAILED);
        }
    }

}
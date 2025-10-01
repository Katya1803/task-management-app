package com.app.taskmanagement.service;

import com.app.taskmanagement.dto.AuthResponse;
import com.app.taskmanagement.dto.OAuth2UserInfo;
import com.app.taskmanagement.exception.AuthException;
import com.app.taskmanagement.exception.InvalidTokenException;
import com.app.taskmanagement.model.RefreshToken;
import com.app.taskmanagement.model.User;
import com.app.taskmanagement.repository.UserRepository;
import com.app.taskmanagement.security.JwtUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2Service {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

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

    /**
     * Verify Google ID Token and process login/registration
     */
    @Transactional
    public AuthResponse loginWithGoogle(String idToken, HttpServletRequest request, HttpServletResponse response) {
        OAuth2UserInfo userInfo = verifyGoogleToken(idToken);
        return processOAuth2Login(userInfo, request, response);
    }

    /**
     * Verify Facebook Access Token and process login/registration
     */
    @Transactional
    public AuthResponse loginWithFacebook(String accessToken, HttpServletRequest request, HttpServletResponse response) {
        OAuth2UserInfo userInfo = verifyFacebookToken(accessToken);
        return processOAuth2Login(userInfo, request, response);
    }

    /**
     * Link email to Facebook account (fallback when Facebook doesn't return email)
     */
    @Transactional
    public AuthResponse linkEmailToProvider(String providerId, String provider, String email,
                                            HttpServletRequest request, HttpServletResponse response) {
        // Check if user with this email already exists
        Optional<User> existingUserByEmail = userRepository.findByEmail(email);
        if (existingUserByEmail.isPresent()) {
            throw new AuthException("Email already in use by another account");
        }

        // Find user by provider ID
        User.AuthProvider authProvider = User.AuthProvider.valueOf(provider.toUpperCase());
        User user = userRepository.findByProviderAndProviderId(authProvider, providerId)
                .orElseThrow(() -> new AuthException("Provider account not found"));

        // Update email
        user.setEmail(email);
        user.setEmailVerified(false); // Require email verification
        userRepository.save(user);

        log.info("Email linked to {} account: {}", provider, email);

        // Generate tokens
        return generateAuthResponse(user, request, response);
    }

    /**
     * Verify Google ID Token
     */
    private OAuth2UserInfo verifyGoogleToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new InvalidTokenException();
            }

            GoogleIdToken.Payload payload = token.getPayload();

            return OAuth2UserInfo.builder()
                    .providerId(payload.getSubject())
                    .email(payload.getEmail())
                    .fullName((String) payload.get("name"))
                    .emailVerified(payload.getEmailVerified())
                    .provider("GOOGLE")
                    .build();

        } catch (Exception e) {
            log.error("Failed to verify Google token", e);
            throw new InvalidTokenException();
        }
    }

    /**
     * Verify Facebook Access Token
     */
    private OAuth2UserInfo verifyFacebookToken(String accessToken) {
        try {
            // Verify token with Facebook
            String debugUrl = String.format(
                    "https://graph.facebook.com/debug_token?input_token=%s&access_token=%s|%s",
                    accessToken, facebookAppId, facebookAppSecret
            );

            Map<String, Object> debugResponse = webClient.get()
                    .uri(debugUrl)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (debugResponse == null || !isValidFacebookToken(debugResponse)) {
                throw new InvalidTokenException();
            }

            // Get user info
            String userUrl = String.format(
                    "https://graph.facebook.com/me?fields=id,name,email&access_token=%s",
                    accessToken
            );

            Map<String, Object> userResponse = webClient.get()
                    .uri(userUrl)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (userResponse == null) {
                throw new InvalidTokenException();
            }

            String email = (String) userResponse.get("email");
            String name = (String) userResponse.get("name");
            String id = (String) userResponse.get("id");

            return OAuth2UserInfo.builder()
                    .providerId(id)
                    .email(email) // Can be null
                    .fullName(name)
                    .emailVerified(email != null) // Facebook verified email if provided
                    .provider("FACEBOOK")
                    .build();

        } catch (Exception e) {
            log.error("Failed to verify Facebook token", e);
            throw new InvalidTokenException();
        }
    }

    /**
     * Process OAuth2 login/registration
     */
    private AuthResponse processOAuth2Login(OAuth2UserInfo userInfo, HttpServletRequest request, HttpServletResponse response) {
        User.AuthProvider provider = User.AuthProvider.valueOf(userInfo.getProvider());

        // Check if user exists by provider ID
        Optional<User> userByProvider = userRepository.findByProviderAndProviderId(
                provider,
                userInfo.getProviderId()
        );

        if (userByProvider.isPresent()) {
            // Existing OAuth2 user - just login
            User user = userByProvider.get();

            if (!user.getIsActive()) {
                throw new AuthException("Account is disabled");
            }

            log.info("OAuth2 user logged in: {} via {}", user.getEmail(), provider);
            return generateAuthResponse(user, request, response);
        }

        // New OAuth2 user - check if email exists
        if (userInfo.getEmail() == null) {
            // Facebook without email - need to link email later
            return handleOAuth2WithoutEmail(userInfo);
        }

        Optional<User> userByEmail = userRepository.findByEmail(userInfo.getEmail());

        if (userByEmail.isPresent() && allowAccountLinking) {
            // Link OAuth2 to existing user
            User user = userByEmail.get();
            linkProviderToUser(user, provider, userInfo.getProviderId());

            log.info("Linked {} to existing user: {}", provider, user.getEmail());
            return generateAuthResponse(user, request, response);
        }

        if (userByEmail.isPresent() && !allowAccountLinking) {
            throw new AuthException("Email already registered. Please login with your password.");
        }

        // Create new user
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
        log.info("New OAuth2 user created: {} via {}", newUser.getEmail(), provider);

        return generateAuthResponse(newUser, request, response);
    }

    /**
     * Handle OAuth2 login without email (Facebook case)
     */
    private AuthResponse handleOAuth2WithoutEmail(OAuth2UserInfo userInfo) {
        // Create temporary user without email
        User tempUser = User.builder()
                .email("temp_" + userInfo.getProviderId() + "@facebook.temp") // Temporary email
                .fullName(userInfo.getFullName())
                .role(User.Role.USER)
                .authProvider(User.AuthProvider.valueOf(userInfo.getProvider()))
                .providerId(userInfo.getProviderId())
                .emailVerified(false)
                .isActive(true)
                .mfaEnabled(false)
                .build();

        userRepository.save(tempUser);

        log.warn("Facebook user created without email: {}", userInfo.getProviderId());

        throw new AuthException("Email not provided by Facebook. Please link your email using /auth/link-email endpoint. ProviderId: " + userInfo.getProviderId());
    }

    /**
     * Link OAuth2 provider to existing user
     */
    private void linkProviderToUser(User user, User.AuthProvider provider, String providerId) {
        user.setAuthProvider(provider);
        user.setProviderId(providerId);
        userRepository.save(user);
    }

    /**
     * Generate auth response with tokens
     */
    private AuthResponse generateAuthResponse(User user, HttpServletRequest request, HttpServletResponse response) {
        String accessToken = jwtUtil.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, request);

        // Set refresh token in cookie
        setRefreshTokenCookie(response, refreshToken.getToken());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration / 1000)
                .user(mapToUserDto(user))
                .build();
    }

    /**
     * Validate Facebook token response
     */
    private boolean isValidFacebookToken(Map<String, Object> debugResponse) {
        Map<String, Object> data = (Map<String, Object>) debugResponse.get("data");
        if (data == null) return false;

        Boolean isValid = (Boolean) data.get("is_valid");
        String appId = (String) data.get("app_id");

        return Boolean.TRUE.equals(isValid) && facebookAppId.equals(appId);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie("refreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(cookie);
    }

    private com.app.taskmanagement.dto.UserDto mapToUserDto(User user) {
        return com.app.taskmanagement.dto.UserDto.builder()
                .publicId(user.getPublicId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .authProvider(user.getAuthProvider().name())
                .emailVerified(user.getEmailVerified())
                .build();
    }
}
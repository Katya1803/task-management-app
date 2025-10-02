package com.app.taskmanagement.mapper;

import com.app.taskmanagement.constant.SecurityConstants;
import com.app.taskmanagement.dto.response.AuthResponse;
import com.app.taskmanagement.dto.response.UserDto;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuthMapper {

    default AuthResponse toAuthResponse(String accessToken, Long expiresIn, UserDto user) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType(SecurityConstants.TOKEN_TYPE)
                .expiresIn(expiresIn)
                .user(user)
                .build();
    }
}
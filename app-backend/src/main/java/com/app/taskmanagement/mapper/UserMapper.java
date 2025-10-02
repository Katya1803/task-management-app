package com.app.taskmanagement.mapper;

import com.app.taskmanagement.dto.response.UserDto;
import com.app.taskmanagement.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {

    @Mapping(source = "role", target = "role", qualifiedByName = "roleToString")
    @Mapping(source = "authProvider", target = "authProvider", qualifiedByName = "providerToString")
    UserDto toDto(User user);

    @Named("roleToString")
    default String roleToString(User.Role role) {
        return role != null ? role.name() : null;
    }

    @Named("providerToString")
    default String providerToString(User.AuthProvider provider) {
        return provider != null ? provider.name() : null;
    }
}
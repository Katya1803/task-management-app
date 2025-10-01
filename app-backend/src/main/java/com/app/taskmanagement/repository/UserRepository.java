package com.app.taskmanagement.repository;

import com.app.taskmanagement.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPublicId(String publicId);

    @Query("SELECT u FROM User u WHERE u.authProvider = :provider AND u.providerId = :providerId")
    Optional<User> findByProviderAndProviderId(
            @Param("provider") User.AuthProvider provider,
            @Param("providerId") String providerId
    );

    boolean existsByEmail(String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u " +
            "WHERE u.email = :email AND u.authProvider = :provider")
    boolean existsByEmailAndProvider(
            @Param("email") String email,
            @Param("provider") User.AuthProvider provider
    );
}
package com.app.taskmanagement.repository;

import com.app.taskmanagement.model.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    @Query("SELECT ev FROM EmailVerification ev WHERE ev.email = :email AND ev.otpCode = :otp " +
            "AND ev.isUsed = false ORDER BY ev.createdAt DESC")
    Optional<EmailVerification> findValidOtpByEmailAndCode(
            @Param("email") String email,
            @Param("otp") String otp
    );

    @Query("SELECT ev FROM EmailVerification ev WHERE ev.email = :email " +
            "AND ev.isUsed = false AND ev.expiresAt > :now ORDER BY ev.createdAt DESC")
    Optional<EmailVerification> findLatestUnusedByEmail(
            @Param("email") String email,
            @Param("now") LocalDateTime now
    );

    @Modifying
    @Query("UPDATE EmailVerification ev SET ev.isUsed = true WHERE ev.email = :email AND ev.isUsed = false")
    void markAllAsUsedByEmail(@Param("email") String email);

    @Modifying
    @Query("DELETE FROM EmailVerification ev WHERE ev.expiresAt < :now AND ev.isUsed = false")
    void deleteExpiredUnused(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(ev) FROM EmailVerification ev WHERE ev.email = :email " +
            "AND ev.createdAt > :since")
    long countRecentAttempts(
            @Param("email") String email,
            @Param("since") LocalDateTime since
    );
}
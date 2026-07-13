package com.example.chatbot.service;

import com.example.chatbot.model.OtpVerification;
import com.example.chatbot.repository.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    private static final int COOLDOWN_SECONDS = 60;
    private static final int MAX_REQUESTS_PER_HOUR = 5;

    @Transactional
    public void generateAndSendOtp(String email, String purpose) {
        // 1. Validate email format
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Invalid email format.");
        }

        LocalDateTime now = LocalDateTime.now();

        // 2. Enforce Cooldown Limit (60 seconds for same purpose)
        Optional<OtpVerification> latestOpt = otpVerificationRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose);
        if (latestOpt.isPresent()) {
            LocalDateTime lastCreatedAt = latestOpt.get().getCreatedAt();
            if (lastCreatedAt.plusSeconds(COOLDOWN_SECONDS).isAfter(now)) {
                long waitTime = java.time.Duration.between(lastCreatedAt, now).getSeconds();
                throw new IllegalStateException("Cooldown active. Please wait " + (COOLDOWN_SECONDS - waitTime) + " seconds before requesting a new OTP.");
            }
        }

        // 3. Enforce Rate Limiting (Max 5 requests per hour overall)
        LocalDateTime oneHourAgo = now.minusHours(1);
        long requestsCount = otpVerificationRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (requestsCount >= MAX_REQUESTS_PER_HOUR) {
            throw new IllegalStateException("Too many OTP requests. Please try again after 1 hour.");
        }

        // 4. Generate 6-digit OTP
        String rawOtp = String.format("%06d", new Random().nextInt(900000) + 100000);

        // 5. Hash OTP and Save to DB
        String hashedOtp = passwordEncoder.encode(rawOtp);
        OtpVerification verification = OtpVerification.builder()
                .email(email)
                .otp(hashedOtp)
                .purpose(purpose)
                .expiryTime(now.plusMinutes(5))
                .createdAt(now)
                .build();
        otpVerificationRepository.save(verification);

        // 6. Send OTP via Gmail with custom flow text
        String subject = "SIGNUP".equals(purpose) ? "Activate Your Jarvis Mainframe" : "Reset Your Jarvis Mainframe Access";
        String flowName = "SIGNUP".equals(purpose) ? "Jarvis Activation Protocol" : "Security Override Code";
        try {
            emailService.sendOtpEmail(email, rawOtp, subject, flowName);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", email, e);
            throw new RuntimeException("Failed to send OTP verification email. Please try again later.");
        }
    }

    @Transactional
    public boolean verifyOtp(String email, String rawOtp, String purpose) {
        if (email == null || rawOtp == null || purpose == null) {
            return false;
        }

        Optional<OtpVerification> latestOpt = otpVerificationRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose);
        if (latestOpt.isEmpty()) {
            return false;
        }

        OtpVerification verification = latestOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // Check if expired or doesn't match
        if (now.isAfter(verification.getExpiryTime()) ||
                !passwordEncoder.matches(rawOtp, verification.getOtp())) {
            return false;
        }

        // OTP is valid! Delete immediately to prevent reuse
        otpVerificationRepository.delete(verification);
        log.info("OTP successfully verified and deleted for email {} and purpose {}", email, purpose);
        return true;
    }

    /**
     * Scheduled cleanup for expired OTP records. Runs every 10 minutes.
     */
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void cleanExpiredOtps() {
        LocalDateTime now = LocalDateTime.now();
        otpVerificationRepository.deleteByExpiryTimeBefore(now);
        log.info("Executed scheduled cleanup of expired OTPs at {}", now);
    }
}

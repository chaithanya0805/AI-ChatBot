package com.example.chatbot.service;

import com.example.chatbot.dto.SignUpRequest;
import com.example.chatbot.model.User;
import com.example.chatbot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User signup(SignUpRequest request) {
        Optional<User> existing = userRepository.findByEmail(request.getEmail());

        User user;
        if (existing.isPresent()) {
            User existingUser = existing.get();
            if (existingUser.isEmailVerified()) {
                throw new IllegalArgumentException("Email is already registered.");
            }
            // Update details of unverified pending user
            existingUser.setFullName(request.getFullName());
            existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
            existingUser.setUpdatedAt(LocalDateTime.now());
            user = existingUser;
        } else {
            user = User.builder()
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .emailVerified(false)
                    .role("USER")
                    .provider("EMAIL")
                    .status("PENDING")
                    .build();
        }

        log.info("User registered in pending state: {}", request.getEmail());
        return userRepository.save(user);
    }

    @Transactional
    public User verifySignup(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found for email: " + email));

        user.setEmailVerified(true);
        user.setStatus("ACTIVE");

        log.info("User verified and activated: {}", email);
        return userRepository.save(user);
    }

    @Transactional
    public User signin(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Please verify your email address before logging in.");
        }

    log.info("User signed in successfully: {}", email);
    return user;
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found for email: " + email));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        log.info("Password successfully reset for user: {}", email);
        userRepository.save(user);
    }
}

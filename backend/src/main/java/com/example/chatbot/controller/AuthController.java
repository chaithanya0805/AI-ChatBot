package com.example.chatbot.controller;

import com.example.chatbot.dto.*;
import com.example.chatbot.model.User;
import com.example.chatbot.security.JwtUtils;
import com.example.chatbot.service.OtpService;
import com.example.chatbot.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final OtpService otpService;
    private final UserService userService;
    private final JwtUtils jwtUtils;

    @PostMapping("/signup")
    public Mono<ResponseEntity<Object>> signup(@Valid @RequestBody SignUpRequest request) {
        return Mono.fromCallable(() -> userService.signup(request))
                .flatMap(user -> Mono.fromRunnable(() -> otpService.generateAndSendOtp(user.getEmail(), "SIGNUP"))
                        .subscribeOn(Schedulers.boundedElastic())
                        .then(Mono.just(ResponseEntity.ok().body((Object) Map.of(
                                "message", "Registration successful. Please verify the OTP code sent to your email."
                        )))))
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(e -> {
                    log.error("Error signing up", e);
                    HttpStatus status = HttpStatus.BAD_REQUEST;
                    if (e instanceof IllegalStateException && e.getMessage().contains("Too many")) {
                        status = HttpStatus.TOO_MANY_REQUESTS;
                    }
                    return Mono.just(ResponseEntity.status(status).body(Map.of("error", e.getMessage())));
                });
    }

    @PostMapping("/verify-signup")
    public Mono<ResponseEntity<Object>> verifySignup(@Valid @RequestBody VerifySignUpRequest request) {
        return Mono.fromCallable(() -> {
            boolean verified = otpService.verifyOtp(request.getEmail(), request.getOtp(), "SIGNUP");
            if (!verified) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body((Object) Map.of("error", "Invalid or expired verification code."));
            }

            // Verify and activate user
            User user = userService.verifySignup(request.getEmail());

            // Generate JWT
            String token = jwtUtils.generateToken(user.getEmail());

            AuthResponse response = AuthResponse.builder()
                    .token(token)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole())
                    .build();

            return ResponseEntity.ok().body((Object) response);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            log.error("Error verifying registration OTP", e);
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An internal error occurred. Please try again.")));
        });
    }

    @PostMapping("/signin")
    public Mono<ResponseEntity<Object>> signin(@Valid @RequestBody SignInRequest request) {
        return Mono.fromCallable(() -> {
            User user = userService.signin(request.getEmail(), request.getPassword());

            // Generate JWT
            String token = jwtUtils.generateToken(user.getEmail());

            AuthResponse response = AuthResponse.builder()
                    .token(token)
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole())
                    .build();

            return ResponseEntity.ok().body((Object) response);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            log.error("Error signing in", e);
            HttpStatus status = HttpStatus.UNAUTHORIZED;
            if (e instanceof IllegalStateException) {
                status = HttpStatus.FORBIDDEN; // unverified email
            }
            return Mono.just(ResponseEntity.status(status).body(Map.of("error", e.getMessage())));
        });
    }

    @PostMapping("/forgot-password")
    public Mono<ResponseEntity<Object>> forgotPassword(@Valid @RequestBody SendOtpRequest request) {
        return Mono.fromCallable(() -> userService.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("No account registered with this email.")))
                .flatMap(user -> Mono.fromRunnable(() -> otpService.generateAndSendOtp(user.getEmail(), "FORGOT_PASSWORD"))
                        .subscribeOn(Schedulers.boundedElastic())
                        .then(Mono.just(ResponseEntity.ok().body((Object) Map.of(
                                "message", "Reset authorization code sent to your email."
                        )))))
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(e -> {
                    log.error("Error requesting password recovery", e);
                    HttpStatus status = HttpStatus.BAD_REQUEST;
                    if (e instanceof IllegalStateException && e.getMessage().contains("Too many")) {
                        status = HttpStatus.TOO_MANY_REQUESTS;
                    }
                    return Mono.just(ResponseEntity.status(status).body(Map.of("error", e.getMessage())));
                });
    }

    @PostMapping("/reset-password")
    public Mono<ResponseEntity<Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return Mono.fromCallable(() -> {
            boolean verified = otpService.verifyOtp(request.getEmail(), request.getOtp(), "FORGOT_PASSWORD");
            if (!verified) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body((Object) Map.of("error", "Invalid or expired recovery code."));
            }

            // Reset password
            userService.resetPassword(request.getEmail(), request.getPassword());

            return ResponseEntity.ok().body((Object) Map.of("message", "Password reset successful. Please login."));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            log.error("Error resetting password", e);
            return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An internal error occurred. Please try again.")));
        });
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Object>> logout() {
        return Mono.just(ResponseEntity.ok().body(Map.of("message", "Logged out successfully.")));
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<Object>> getMe(Principal principal) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String email = principal.getName();
            return userService.findByEmail(email)
                    .map(user -> {
                        UserResponse res = UserResponse.builder()
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .role(user.getRole())
                                .status(user.getStatus())
                                .profilePicture(user.getProfilePicture())
                                .build();
                        return ResponseEntity.ok().body((Object) res);
                    })
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
        })
        .subscribeOn(Schedulers.boundedElastic());
    }
}

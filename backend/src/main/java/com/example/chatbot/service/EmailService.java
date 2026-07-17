package com.example.chatbot.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class EmailService {

    private final WebClient webClient;
    private final String fromEmail;

    public EmailService(
            @Value("${resend.api.key}") String apiKey,
            @Value("${resend.from:onboarding@resend.dev}") String fromEmail) {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
        this.fromEmail = fromEmail;
    }

    public void sendOtpEmail(String toEmail, String otp, String subject, String flowName) {
        String htmlContent = """
                <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2>%s</h2>
                    <p>Your OTP code is:</p>
                    <h1 style="color:#2563eb;">%s</h1>
                    <p>This OTP is valid for 5 minutes.</p>
                    <br>
                    <p>If you didn't request this OTP, you can safely ignore this email.</p>
                </body>
                </html>
                """.formatted(flowName, otp);

        ResendEmailRequest request = ResendEmailRequest.builder()
                .from(fromEmail)
                .to(toEmail)
                .subject(subject)
                .html(htmlContent)
                .build();

        try {
            log.info("Sending OTP email via Resend to {}", toEmail);
            webClient.post()
                    .uri("/emails")
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("Resend API returned error status: {} - {}", clientResponse.statusCode(), errorBody);
                                        return Mono.error(new RuntimeException("Resend API error: " + clientResponse.statusCode() + " - " + errorBody));
                                    })
                    )
                    .toBodilessEntity()
                    .block();
            log.info("OTP email with subject '{}' successfully sent to {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Failed to deliver email via Resend API to {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email via Resend: " + e.getMessage(), e);
        }
    }

    @Data
    @Builder
    private static class ResendEmailRequest {
        private String from;
        private String to;
        private String subject;
        private String html;
    }
}
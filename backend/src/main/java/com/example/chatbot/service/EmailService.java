package com.example.chatbot.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
@Slf4j
public class EmailService {

    private final WebClient webClient;

    public EmailService(@Value("${brevo.api.key}") String apiKey) {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .defaultHeader("api-key", apiKey)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json")
                .build();
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

        BrevoEmailRequest request = BrevoEmailRequest.builder()
                .sender(Sender.builder().name("Jarvis AI").email("jarvis.ai.chatbot@gmail.com").build())
                .to(List.of(Recipient.builder().email(toEmail).build()))
                .subject(subject)
                .htmlContent(htmlContent)
                .build();

        try {
            log.info("Sending OTP email via Brevo API to {}", toEmail);
            webClient.post()
                    .uri("/smtp/email")
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse ->
                            clientResponse.bodyToMono(String.class)
                                    .flatMap(errorBody -> {
                                        log.error("Brevo API returned error status: {} - {}", clientResponse.statusCode(), errorBody);
                                        return Mono.error(new RuntimeException("Brevo API error: " + clientResponse.statusCode() + " - " + errorBody));
                                    })
                    )
                    .toBodilessEntity()
                    .block();
            log.info("OTP email with subject '{}' successfully sent to {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Failed to deliver email via Brevo API to {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email via Brevo: " + e.getMessage(), e);
        }
    }

    @Data
    @Builder
    private static class BrevoEmailRequest {
        private Sender sender;
        private List<Recipient> to;
        private String subject;
        private String htmlContent;
    }

    @Data
    @Builder
    private static class Sender {
        private String name;
        private String email;
    }

    @Data
    @Builder
    private static class Recipient {
        private String email;
    }
}
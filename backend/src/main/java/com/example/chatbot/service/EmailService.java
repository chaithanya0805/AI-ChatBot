package com.example.chatbot.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromEmail) {
        this.mailSender = mailSender;
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

        try {
            log.info("Sending OTP email via Brevo SMTP to {}", toEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP email with subject '{}' successfully sent to {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Failed to deliver email via SMTP to {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email via SMTP: " + e.getMessage(), e);
        }
    }
}
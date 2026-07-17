package com.example.chatbot.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp, String subject, String flowName) throws MessagingException {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);

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

        helper.setText(htmlContent, true);

        try {
            mailSender.send(message);
            log.info("OTP email with subject '{}' successfully sent to {}", subject, toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email", e);
            e.printStackTrace();
            throw new MessagingException("Failed to send OTP email", e);
        }
    }
}
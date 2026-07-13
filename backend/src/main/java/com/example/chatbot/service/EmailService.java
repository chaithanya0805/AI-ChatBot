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

        String htmlContent = "<div style=\"font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;\">" +
                "  <div style=\"text-align: center; margin-bottom: 24px;\">" +
                "    <div style=\"display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #10b981); color: #ffffff; font-size: 24px; font-weight: bold;\">J</div>" +
                "    <h2 style=\"margin-top: 12px; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;\">" + flowName + "</h2>" +
                "  </div>" +
                "  <p style=\"font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center;\">A request was made to authorize your email for this security procedure. Use the verification code below to proceed.</p>" +
                "  <div style=\"background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;\">" +
                "    <span style=\"font-family: 'JetBrains Mono', Courier, monospace; font-size: 32px; font-weight: 700; color: #00f0ff; letter-spacing: 6px; padding-left: 6px;\">" + otp + "</span>" +
                "    <div style=\"font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 500;\">EXPIRES IN 5 MINUTES</div>" +
                "  </div>" +
                "  <p style=\"font-size: 12px; color: #64748b; text-align: center; margin-top: 32px;\">If you did not initiate this authorization, please ignore this email.</p>" +
                "</div>";

        helper.setText(htmlContent, true);
        mailSender.send(message);
        log.info("OTP email with subject '{}' successfully sent to {}", subject, toEmail);
    }
}

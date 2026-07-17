package com.example.chatbot;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChatbotApplication {

    public static void main(String[] args) {

        try {
            Dotenv dotenv;
            try {
                dotenv = Dotenv.configure()
                        .directory("./backend")
                        .ignoreIfMalformed()
                        .load();
            } catch (Exception e) {
                dotenv = Dotenv.configure()
                        .directory("./")
                        .ignoreIfMalformed()
                        .ignoreIfMissing()
                        .load();
            }

            if (dotenv != null) {
                dotenv.entries().forEach(entry ->
                        System.setProperty(entry.getKey(), entry.getValue()));
            }
        } catch (Exception e) {
            System.out.println("No .env file found or error loading it. Using system environment variables.");
        }

        SpringApplication.run(ChatbotApplication.class, args);
    }
}
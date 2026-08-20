package com.example.chatbot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "gemini.api")
public class GeminiApiProperties {

    /**
     * Legacy single-key fallback (maps to key slot 1 when key1 is blank).
     */
    private String key = "";

    private String key1 = "";
    private String key2 = "";
    private String key3 = "";
    private String key4 = "";
    private String key5 = "";

    private long keyCooldownSeconds = 60;
}

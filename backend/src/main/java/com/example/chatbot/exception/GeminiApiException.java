package com.example.chatbot.exception;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;

@Getter
public class GeminiApiException extends RuntimeException {

    private final HttpStatusCode statusCode;
    private final String responseBody;
    private final int keyIndex;

    public GeminiApiException(int keyIndex, HttpStatusCode statusCode, String responseBody) {
        super("Gemini API request failed for key " + keyIndex + " with status " + statusCode.value());
        this.keyIndex = keyIndex;
        this.statusCode = statusCode;
        this.responseBody = responseBody != null ? responseBody : "";
    }
}

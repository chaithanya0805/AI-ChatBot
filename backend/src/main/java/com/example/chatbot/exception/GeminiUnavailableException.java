package com.example.chatbot.exception;

public class GeminiUnavailableException extends RuntimeException {

    public static final String USER_MESSAGE = "Jarvis is currently unavailable. Please try again later.";

    public GeminiUnavailableException() {
        super(USER_MESSAGE);
    }

    public GeminiUnavailableException(String message) {
        super(message);
    }
}

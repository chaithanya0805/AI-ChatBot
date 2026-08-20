package com.example.chatbot.exception;

public class ChatSessionNotFoundException extends RuntimeException {
    public ChatSessionNotFoundException(String sessionId) {
        super("Chat session not found: " + sessionId);
    }
}

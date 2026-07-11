package com.example.chatbot.service;

import com.example.chatbot.model.ChatMessage;
import com.example.chatbot.model.ChatSession;
import com.example.chatbot.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryService {

    private final ChatSessionRepository chatSessionRepository;

    @Transactional(readOnly = true)
    public List<ChatSession> getAllChats() {
        try {
            return chatSessionRepository.findAllByOrderByTimestampDesc();
        } catch (Exception e) {
            log.error("Database error while fetching chats", e);
            throw new RuntimeException("Database is currently unavailable. Chat history could not be loaded.");
        }
    }

    @Transactional
    public ChatSession saveChatSession(ChatSession session) {
        try {

            boolean isNewSession =
                    session.getSessionId() == null ||
                    !session.getSessionId().startsWith("S");

            if (isNewSession) {

    // NEW CHAT
    session.setSessionId(generateNextSessionId());

    LocalDateTime now = LocalDateTime.now();

    System.out.println("================================");
    System.out.println("LocalDateTime : " + now);
    System.out.println("Zone          : " + java.time.ZoneId.systemDefault());
    System.out.println("Zoned         : " + java.time.ZonedDateTime.now());
    System.out.println("================================");

    session.setCreatedAt(now);
    session.setTimestamp(now);

} else {

    // EXISTING CHAT -> UPDATE
    ChatSession existing = chatSessionRepository
            .findBySessionId(session.getSessionId())
            .orElseThrow(() ->
                    new RuntimeException("Chat session not found"));

    session.setId(existing.getId());
    session.setCreatedAt(existing.getCreatedAt());
    session.setTimestamp(LocalDateTime.now());
}
            // Message timestamps
            if (session.getMessages() != null) {

                LocalDateTime base = LocalDateTime.now();

                for (int i = 0; i < session.getMessages().size(); i++) {

                    ChatMessage msg = session.getMessages().get(i);

                    if (msg.getCreatedAt() == null) {
                        msg.setCreatedAt(base.plusNanos(i * 1_000_000L));
                    }
                }
            }

            return chatSessionRepository.save(session);

        } catch (Exception e) {
            log.error("Database error while saving chat session", e);
            throw new RuntimeException("Database is currently unavailable. Chat session could not be saved.");
        }
    }

    @Transactional
    public void deleteChatSession(String sessionId) {
        try {
            chatSessionRepository.deleteBySessionId(sessionId);
        } catch (Exception e) {
            log.error("Database error while deleting chat session", e);
            throw new RuntimeException("Database is currently unavailable. Chat session could not be deleted.");
        }
    }

    @Transactional
    public void deleteAllChats() {
        try {
            chatSessionRepository.deleteAllMessages();
            chatSessionRepository.deleteAllSessions();
        } catch (Exception e) {
            log.error("Database error while clearing chat history", e);
            throw new RuntimeException("Database is currently unavailable. Chat history could not be cleared.");
        }
    }

    private String generateNextSessionId() {

        String lastSessionId = chatSessionRepository.findLastSessionId().orElse(null);

        if (lastSessionId == null || !lastSessionId.startsWith("S")) {
            return "S1";
        }

        try {
            int number = Integer.parseInt(lastSessionId.substring(1));
            return "S" + (number + 1);
        } catch (Exception e) {
            return "S1";
        }
    }
}
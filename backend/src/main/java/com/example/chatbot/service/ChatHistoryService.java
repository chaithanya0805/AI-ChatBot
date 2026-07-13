package com.example.chatbot.service;

import com.example.chatbot.model.ChatMessage;
import com.example.chatbot.model.ChatSession;
import com.example.chatbot.model.User;
import com.example.chatbot.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryService {

    private final ChatSessionRepository chatSessionRepository;

    @Transactional(readOnly = true)
    public List<ChatSession> getAllChatsOfUser(User user) {
        try {
            return chatSessionRepository.findByUserOrderByTimestampDesc(user);
        } catch (Exception e) {
            log.error("Database error while fetching chats for user: {}", user.getEmail(), e);
            throw new RuntimeException("Database is currently unavailable. Chat history could not be loaded.");
        }
    }

    @Transactional
    public ChatSession saveChatSession(ChatSession session, User user) {
        try {
            boolean isNewSession =
                    session.getSessionId() == null ||
                    !session.getSessionId().startsWith("S");

            if (isNewSession) {
                // NEW CHAT
                session.setSessionId(generateNextSessionId());
                session.setUser(user);

                LocalDateTime now = LocalDateTime.now();
                session.setCreatedAt(now);
                session.setTimestamp(now);
            } else {
                // EXISTING CHAT -> UPDATE
                ChatSession existing = chatSessionRepository
                        .findBySessionId(session.getSessionId())
                        .orElseThrow(() -> new RuntimeException("Chat session not found"));

                // Verify Ownership
                if (existing.getUser() == null || !existing.getUser().getId().equals(user.getId())) {
                    log.warn("Access denied: User {} tried to access session {} owned by {}", 
                            user.getEmail(), session.getSessionId(), 
                            existing.getUser() != null ? existing.getUser().getEmail() : "null");
                    throw new AccessDeniedException("Unauthorized access to this chat session.");
                }

                session.setId(existing.getId());
                session.setUser(user);
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

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (Exception e) {
            log.error("Database error while saving chat session for user: {}", user.getEmail(), e);
            throw new RuntimeException("Database is currently unavailable. Chat session could not be saved.");
        }
    }

    @Transactional
    public void deleteChatSession(String sessionId, User user) {
        try {
            ChatSession existing = chatSessionRepository
                    .findBySessionId(sessionId)
                    .orElseThrow(() -> new RuntimeException("Chat session not found"));

            // Verify Ownership
            if (existing.getUser() == null || !existing.getUser().getId().equals(user.getId())) {
                log.warn("Access denied: User {} tried to delete session {} owned by {}", 
                        user.getEmail(), sessionId, 
                        existing.getUser() != null ? existing.getUser().getEmail() : "null");
                throw new AccessDeniedException("Unauthorized access to this chat session.");
            }

            chatSessionRepository.deleteBySessionId(sessionId);
        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (Exception e) {
            log.error("Database error while deleting chat session for user: {}", user.getEmail(), e);
            throw new RuntimeException("Database is currently unavailable. Chat session could not be deleted.");
        }
    }

    @Transactional
    public void deleteAllChatsOfUser(User user) {
        try {
            List<ChatSession> userSessions = chatSessionRepository.findByUser(user);
            chatSessionRepository.deleteAll(userSessions);
        } catch (Exception e) {
            log.error("Database error while clearing chat history for user: {}", user.getEmail(), e);
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
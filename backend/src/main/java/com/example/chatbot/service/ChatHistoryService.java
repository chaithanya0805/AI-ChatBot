package com.example.chatbot.service;

import com.example.chatbot.exception.ChatSessionNotFoundException;
import com.example.chatbot.exception.DatabaseUnavailableException;
import com.example.chatbot.model.ChatMessage;
import com.example.chatbot.model.ChatSession;
import com.example.chatbot.model.User;
import com.example.chatbot.repository.ChatSessionRepository;
import com.example.chatbot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryService {

    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ChatSession> getAllChatsOfUser(User user) {
        User managedUser = requireManagedUser(user);
        return runWithConnectivityHandling(
                () -> chatSessionRepository.findByUserOrderByTimestampDesc(managedUser),
                "fetching chats for user: " + managedUser.getEmail(),
                "Database is currently unavailable. Chat history could not be loaded.");
    }

    @Transactional
    public ChatSession saveChatSession(ChatSession session, User user) {
        return saveChatSession(session, user, java.util.UUID.randomUUID().toString());
    }

    @Transactional
    public ChatSession saveChatSession(ChatSession session, User user, String requestId) {
        String threadName = Thread.currentThread().getName();
        User managedUser = requireManagedUser(user);
        log.info("[Service] [REQ: {}] [THREAD: {}] Entered saveChatSession. SessionId: {}, UserId: {}",
                requestId, threadName, session.getSessionId(), managedUser.getId());

        try {
            boolean isNewSession =
                    session.getSessionId() == null ||
                    !session.getSessionId().startsWith("S");

            if (isNewSession) {
                session.setSessionId(generateNextSessionId());
                session.setUser(managedUser);

                LocalDateTime now = LocalDateTime.now();
                session.setCreatedAt(now);
                session.setTimestamp(now);
            } else {
                final String requestedSessionId = session.getSessionId();
                log.info("[Service] [REQ: {}] [THREAD: {}] Before findBySessionIdWithUser", requestId, threadName);
                ChatSession existing = chatSessionRepository
                        .findBySessionIdWithUser(requestedSessionId)
                        .orElseThrow(() -> new ChatSessionNotFoundException(requestedSessionId));
                log.info("[Service] [REQ: {}] [THREAD: {}] After findBySessionIdWithUser", requestId, threadName);

                verifyOwnership(existing, managedUser, requestId, threadName, "access");

                existing.setTitle(session.getTitle());
                existing.setTimestamp(LocalDateTime.now());

                existing.getMessages().clear();
                if (session.getMessages() != null) {
                    existing.getMessages().addAll(session.getMessages());
                }

                session = existing;
            }

            if (session.getMessages() != null) {
                LocalDateTime base = LocalDateTime.now();
                for (int i = 0; i < session.getMessages().size(); i++) {
                    ChatMessage msg = session.getMessages().get(i);
                    msg.setId(null);
                    msg.setChatSession(session);
                    if (msg.getCreatedAt() == null) {
                        msg.setCreatedAt(base.plusNanos(i * 1_000_000L));
                    }
                }
            }

            log.info("[Service] [REQ: {}] [THREAD: {}] Before chatSessionRepository.save", requestId, threadName);
            ChatSession saved = chatSessionRepository.save(session);
            log.info("[Service] [REQ: {}] [THREAD: {}] After chatSessionRepository.save", requestId, threadName);
            return saved;

        } catch (AccessDeniedException | ChatSessionNotFoundException | IllegalArgumentException e) {
            throw e;
        } catch (DataAccessException e) {
            if (isDatabaseConnectivityIssue(e)) {
                log.error("[Service] [REQ: {}] Database connectivity error while saving chat session for user: {}",
                        requestId, managedUser.getEmail(), e);
                throw new DatabaseUnavailableException(
                        "Database is currently unavailable. Chat session could not be saved.", e);
            }
            log.error("[Service] [REQ: {}] Data access error while saving chat session for user: {}",
                    requestId, managedUser.getEmail(), e);
            throw e;
        }
    }

    @Transactional
    public void deleteChatSession(String sessionId, User user) {
        deleteChatSession(sessionId, user, java.util.UUID.randomUUID().toString());
    }

    @Transactional
    public void deleteChatSession(String sessionId, User user, String requestId) {
        String threadName = Thread.currentThread().getName();
        User managedUser = requireManagedUser(user);
        log.info("[Service] [REQ: {}] [THREAD: {}] Entered deleteChatSession. SessionId: {}, UserId: {}",
                requestId, threadName, sessionId, managedUser.getId());

        try {
            log.info("[Service] [REQ: {}] [THREAD: {}] Before findBySessionIdWithUser", requestId, threadName);
            ChatSession existing = chatSessionRepository
                    .findBySessionIdWithUser(sessionId)
                    .orElseThrow(() -> new ChatSessionNotFoundException(sessionId));
            log.info("[Service] [REQ: {}] [THREAD: {}] After findBySessionIdWithUser", requestId, threadName);

            verifyOwnership(existing, managedUser, requestId, threadName, "delete");

            log.info("[Service] [REQ: {}] [THREAD: {}] Before chatSessionRepository.delete", requestId, threadName);
            chatSessionRepository.delete(existing);
            log.info("[Service] [REQ: {}] [THREAD: {}] After chatSessionRepository.delete", requestId, threadName);
        } catch (AccessDeniedException | ChatSessionNotFoundException | IllegalArgumentException e) {
            throw e;
        } catch (DataAccessException e) {
            if (isDatabaseConnectivityIssue(e)) {
                log.error("[Service] [REQ: {}] Database connectivity error while deleting chat session for user: {}",
                        requestId, managedUser.getEmail(), e);
                throw new DatabaseUnavailableException(
                        "Database is currently unavailable. Chat session could not be deleted.", e);
            }
            log.error("[Service] [REQ: {}] Data access error while deleting chat session for user: {}",
                    requestId, managedUser.getEmail(), e);
            throw e;
        }
    }

    @Transactional
    public void deleteAllChatsOfUser(User user) {
        User managedUser = requireManagedUser(user);
        runWithConnectivityHandling(
                () -> {
                    List<ChatSession> userSessions = chatSessionRepository.findByUser(managedUser);
                    chatSessionRepository.deleteAll(userSessions);
                    return null;
                },
                "clearing chat history for user: " + managedUser.getEmail(),
                "Database is currently unavailable. Chat history could not be cleared.");
    }

    private User requireManagedUser(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("A valid user is required.");
        }
        return userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User record not found."));
    }

    private void verifyOwnership(ChatSession existing, User managedUser, String requestId,
                                   String threadName, String action) {
        if (existing.getUser() == null || !existing.getUser().getId().equals(managedUser.getId())) {
            log.warn("[Service] [REQ: {}] [THREAD: {}] Access denied: User {} tried to {} session {} owned by {}",
                    requestId, threadName, managedUser.getEmail(), action, existing.getSessionId(),
                    existing.getUser() != null ? existing.getUser().getEmail() : "null");
            throw new AccessDeniedException("Unauthorized access to this chat session.");
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
        } catch (NumberFormatException e) {
            return "S1";
        }
    }

    private <T> T runWithConnectivityHandling(Supplier<T> action, String operation, String unavailableMessage) {
        try {
            return action.get();
        } catch (AccessDeniedException | ChatSessionNotFoundException | IllegalArgumentException e) {
            throw e;
        } catch (DataAccessException e) {
            if (isDatabaseConnectivityIssue(e)) {
                log.error("Database connectivity error while {}", operation, e);
                throw new DatabaseUnavailableException(unavailableMessage, e);
            }
            log.error("Data access error while {}", operation, e);
            throw e;
        }
    }

    private boolean isDatabaseConnectivityIssue(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof CannotGetJdbcConnectionException
                    || current instanceof QueryTimeoutException
                    || current instanceof DataAccessResourceFailureException) {
                return true;
            }
            String name = current.getClass().getName();
            if (name.contains("SQLTransientConnectionException")
                    || (name.contains("PSQLException")
                    && current.getMessage() != null
                    && (current.getMessage().contains("Connection refused")
                    || current.getMessage().contains("connection has been closed")
                    || current.getMessage().contains("too many connections")))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}

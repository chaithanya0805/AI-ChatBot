package com.example.chatbot.repository;

import com.example.chatbot.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    // Retrieve chat sessions ordered by updated_at (timestamp) descending
    List<ChatSession> findAllByOrderByTimestampDesc();

    // Find session by its readable session_id (e.g. S1, S2)
    Optional<ChatSession> findBySessionId(String sessionId);

    // Delete session by its readable session_id
    void deleteBySessionId(String sessionId);

    // Query the last generated session_id to calculate the next index sequence
    @Query(value = "SELECT session_id FROM chat_sessions ORDER BY id DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLastSessionId();

    @Modifying
    @Query(value = "DELETE FROM chat_messages", nativeQuery = true)
    void deleteAllMessages();

    @Modifying
    @Query(value = "DELETE FROM chat_sessions", nativeQuery = true)
    void deleteAllSessions();
}

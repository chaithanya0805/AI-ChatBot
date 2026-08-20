package com.example.chatbot.controller;

import com.example.chatbot.exception.ChatSessionNotFoundException;
import com.example.chatbot.exception.DatabaseUnavailableException;
import com.example.chatbot.exception.UserNotFoundException;
import jakarta.persistence.PersistenceException;
import org.hibernate.LazyInitializationException;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionException;

final class ChatHistoryErrorMapper {

    private ChatHistoryErrorMapper() {}

    static ResponseEntity<Object> toResponse(Throwable e) {
        if (!(e instanceof Exception exception)) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An unexpected error occurred while processing your request.");
        }
        return toResponse(exception);
    }

    static ResponseEntity<Object> toResponse(Exception e) {
        Exception typed = resolveTypedException(e);

        if (typed instanceof AccessDeniedException accessDenied) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(accessDenied.getMessage());
        }
        if (typed instanceof ChatSessionNotFoundException notFound) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(notFound.getMessage());
        }
        if (typed instanceof UserNotFoundException userNotFound) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(userNotFound.getMessage());
        }
        if (typed instanceof DatabaseUnavailableException unavailable) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(unavailable.getMessage());
        }
        if (typed instanceof IllegalArgumentException illegalArgument) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(illegalArgument.getMessage());
        }
        if (typed instanceof LazyInitializationException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Unable to load chat session data. Please try again.");
        }
        if (typed instanceof TransactionException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("A transaction error occurred while processing your request.");
        }
        if (typed instanceof PersistenceException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Unable to persist chat session data. Please try again.");
        }
        if (typed instanceof DataAccessException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("A database error occurred while processing your request.");
        }

        String message = typed.getMessage();
        if (message != null && !message.isBlank()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(message);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("An unexpected error occurred while processing your request.");
    }

    private static Exception resolveTypedException(Exception e) {
        if (e instanceof AccessDeniedException
                || e instanceof ChatSessionNotFoundException
                || e instanceof UserNotFoundException
                || e instanceof DatabaseUnavailableException
                || e instanceof IllegalArgumentException
                || e instanceof LazyInitializationException
                || e instanceof TransactionException
                || e instanceof PersistenceException
                || e instanceof DataAccessException) {
            return e;
        }

        Throwable root = NestedExceptionUtils.getMostSpecificCause(e);
        if (root instanceof Exception rootException) {
            return resolveTypedException(rootException);
        }
        return e;
    }
}

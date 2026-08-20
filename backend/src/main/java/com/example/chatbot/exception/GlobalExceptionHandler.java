package com.example.chatbot.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ServerWebExchange;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(GeminiUnavailableException.class)
    public ResponseEntity<String> handleGeminiUnavailable(GeminiUnavailableException ex, ServerWebExchange exchange) {
        String requestId = exchange != null ? exchange.getAttributeOrDefault("requestId", "UNKNOWN") : "UNKNOWN";
        log.warn("[GlobalExceptionHandler] [REQ: {}] Gemini unavailable: {}", requestId, ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(GeminiUnavailableException.USER_MESSAGE);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex, ServerWebExchange exchange) {
        String requestId = exchange != null ? exchange.getAttributeOrDefault("requestId", "UNKNOWN") : "UNKNOWN";
        String threadName = Thread.currentThread().getName();
        log.warn("[GlobalExceptionHandler] [REQ: {}] [THREAD: {}] MethodArgumentNotValidException caught", requestId, threadName, ex);
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex, ServerWebExchange exchange) {
        String requestId = exchange != null ? exchange.getAttributeOrDefault("requestId", "UNKNOWN") : "UNKNOWN";
        String threadName = Thread.currentThread().getName();
        
        java.io.StringWriter sw = new java.io.StringWriter();
        java.io.PrintWriter pw = new java.io.PrintWriter(sw);
        ex.printStackTrace(pw);
        Throwable rootCause = org.springframework.core.NestedExceptionUtils.getMostSpecificCause(ex);
        
        log.error("[GlobalExceptionHandler] [REQ: {}] [THREAD: {}] Exception caught: {}. Root cause: {}. Stack trace:\n{}", 
                requestId, threadName, ex.getClass().getName(), rootCause.getClass().getName() + ": " + rootCause.getMessage(), sw.toString(), ex);
        
        Map<String, String> response = new HashMap<>();
        response.put("error", "Internal Server Error");
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}

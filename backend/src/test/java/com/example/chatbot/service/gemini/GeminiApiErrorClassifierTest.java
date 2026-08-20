package com.example.chatbot.service.gemini;

import com.example.chatbot.config.GeminiApiProperties;
import com.example.chatbot.exception.GeminiApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeminiApiErrorClassifierTest {

    @Test
    void detects429AsFailover() {
        GeminiApiException error = new GeminiApiException(1, HttpStatus.TOO_MANY_REQUESTS, "Rate limit exceeded");
        assertTrue(GeminiApiErrorClassifier.shouldFailover(error));
        assertEquals("quota/rate limit", GeminiApiErrorClassifier.describeReason(error));
    }

    @Test
    void detects401And403AsFailover() {
        GeminiApiException unauthorized = new GeminiApiException(1, HttpStatus.UNAUTHORIZED, "Invalid API key");
        GeminiApiException forbidden = new GeminiApiException(2, HttpStatus.FORBIDDEN, "Permission denied");

        assertTrue(GeminiApiErrorClassifier.shouldFailover(unauthorized));
        assertTrue(GeminiApiErrorClassifier.shouldFailover(forbidden));
    }

    @Test
    void detects500WithQuotaBodyAsFailover() {
        GeminiApiException error = new GeminiApiException(
                1,
                HttpStatus.INTERNAL_SERVER_ERROR,
                "{\"error\":{\"status\":\"RESOURCE_EXHAUSTED\"}}"
        );
        assertTrue(GeminiApiErrorClassifier.shouldFailover(error));
    }

    @Test
    void ignores500WithoutQuotaIndicators() {
        GeminiApiException error = new GeminiApiException(1, HttpStatus.INTERNAL_SERVER_ERROR, "Null pointer");
        assertFalse(GeminiApiErrorClassifier.shouldFailover(error));
    }

    @Test
    void ignores400BadRequest() {
        GeminiApiException error = new GeminiApiException(1, HttpStatus.BAD_REQUEST, "Invalid payload");
        assertFalse(GeminiApiErrorClassifier.shouldFailover(error));
    }

    @Test
    void detectsWebClient429AsFailover() {
        WebClientResponseException error = WebClientResponseException.create(
                429,
                "Too Many Requests",
                null,
                "quota exceeded".getBytes(),
                null
        );
        assertTrue(GeminiApiErrorClassifier.shouldFailover(error));
    }
}

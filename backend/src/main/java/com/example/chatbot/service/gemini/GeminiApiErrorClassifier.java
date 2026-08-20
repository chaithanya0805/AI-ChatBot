package com.example.chatbot.service.gemini;

import com.example.chatbot.exception.GeminiApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Locale;
import java.util.Set;

public final class GeminiApiErrorClassifier {

    private static final Set<HttpStatus> ALWAYS_FAILOVER_STATUSES = Set.of(
            HttpStatus.TOO_MANY_REQUESTS,
            HttpStatus.UNAUTHORIZED,
            HttpStatus.FORBIDDEN,
            HttpStatus.SERVICE_UNAVAILABLE,
            HttpStatus.BAD_GATEWAY,
            HttpStatus.GATEWAY_TIMEOUT
    );

    private static final String[] QUOTA_BODY_INDICATORS = {
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "exceeded",
            "too many requests",
            "capacity",
            "limit exceeded"
    };

    private GeminiApiErrorClassifier() {
    }

    public static boolean shouldFailover(Throwable error) {
        if (error instanceof GeminiApiException geminiError) {
            return isFailoverStatus(geminiError.getStatusCode(), geminiError.getResponseBody());
        }
        if (error instanceof WebClientResponseException webError) {
            return isFailoverStatus(webError.getStatusCode(), webError.getResponseBodyAsString());
        }
        return false;
    }

    public static String describeReason(Throwable error) {
        if (error instanceof GeminiApiException geminiError) {
            return describeStatus(geminiError.getStatusCode(), geminiError.getResponseBody());
        }
        if (error instanceof WebClientResponseException webError) {
            return describeStatus(webError.getStatusCode(), webError.getResponseBodyAsString());
        }
        return "unknown error";
    }

    static boolean isFailoverStatus(HttpStatusCode statusCode, String responseBody) {
        if (statusCode == null) {
            return false;
        }

        HttpStatus status = HttpStatus.resolve(statusCode.value());
        if (status != null && ALWAYS_FAILOVER_STATUSES.contains(status)) {
            return true;
        }

        if (status == HttpStatus.INTERNAL_SERVER_ERROR && containsQuotaIndicator(responseBody)) {
            return true;
        }

        return false;
    }

    private static String describeStatus(HttpStatusCode statusCode, String responseBody) {
        HttpStatus status = statusCode != null ? HttpStatus.resolve(statusCode.value()) : null;

        if (status == HttpStatus.TOO_MANY_REQUESTS) {
            return "quota/rate limit";
        }
        if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
            return "authentication/invalid key";
        }
        if (status == HttpStatus.SERVICE_UNAVAILABLE
                || status == HttpStatus.BAD_GATEWAY
                || status == HttpStatus.GATEWAY_TIMEOUT) {
            return "provider unavailable";
        }
        if (status == HttpStatus.INTERNAL_SERVER_ERROR && containsQuotaIndicator(responseBody)) {
            return "quota/rate limit";
        }
        return "HTTP " + (statusCode != null ? statusCode.value() : "unknown");
    }

    private static boolean containsQuotaIndicator(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return false;
        }
        String normalized = responseBody.toLowerCase(Locale.ROOT);
        for (String indicator : QUOTA_BODY_INDICATORS) {
            if (normalized.contains(indicator)) {
                return true;
            }
        }
        return false;
    }
}

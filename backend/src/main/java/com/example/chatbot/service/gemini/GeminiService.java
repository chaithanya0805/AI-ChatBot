package com.example.chatbot.service.gemini;

import com.example.chatbot.exception.GeminiApiException;
import com.example.chatbot.exception.GeminiUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
public class GeminiService {

    private static final String GENERATE_CONTENT_PATH = "/v1beta/models/gemini-2.5-flash:generateContent";

    private final WebClient webClient;
    private final GeminiApiKeyManager keyManager;

    public GeminiService(GeminiApiKeyManager keyManager) {
        this.keyManager = keyManager;
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public Mono<String> generateContent(String prompt) {
        if (keyManager.getConfiguredKeyCount() == 0) {
            log.error("Gemini request rejected: no API keys configured.");
            return Mono.error(new GeminiUnavailableException());
        }

        return attemptWithFailover(prompt, new HashSet<>());
    }

    private Mono<String> attemptWithFailover(String prompt, Set<Integer> triedKeyIndices) {
        var keyOpt = keyManager.selectAvailableKey(triedKeyIndices);
        if (keyOpt.isEmpty()) {
            log.error("All configured Gemini API keys are unavailable or exhausted.");
            return Mono.error(new GeminiUnavailableException());
        }

        GeminiApiKeyManager.KeySlot keySlot = keyOpt.get();
        return callGemini(prompt, keySlot)
                .onErrorResume(error -> handleGeminiFailure(prompt, triedKeyIndices, keySlot, error));
    }

    private Mono<String> handleGeminiFailure(
            String prompt,
            Set<Integer> triedKeyIndices,
            GeminiApiKeyManager.KeySlot failedKey,
            Throwable error
    ) {
        if (!GeminiApiErrorClassifier.shouldFailover(error)) {
            log.error("Gemini request failed with non-failover error using key {}.", failedKey.getIndex(), error);
            return Mono.error(error);
        }

        String reason = GeminiApiErrorClassifier.describeReason(error);
        keyManager.markUnavailable(failedKey.getIndex(), reason);

        Set<Integer> nextTried = new HashSet<>(triedKeyIndices);
        nextTried.add(failedKey.getIndex());

        if (nextTried.size() >= keyManager.getConfiguredKeyCount()) {
            log.error("All {} configured Gemini API keys failed for this request.", keyManager.getConfiguredKeyCount());
            return Mono.error(new GeminiUnavailableException());
        }

        var nextKeyOpt = keyManager.selectAvailableKey(nextTried);
        if (nextKeyOpt.isEmpty()) {
            log.error("No additional Gemini API keys available after key {} failure.", failedKey.getIndex());
            return Mono.error(new GeminiUnavailableException());
        }

        keyManager.logSwitching(failedKey.getIndex(), nextKeyOpt.get().getIndex(), reason);
        return attemptWithFailover(prompt, nextTried);
    }

    private Mono<String> callGemini(String prompt, GeminiApiKeyManager.KeySlot keySlot) {
        Map<String, Object> body = Map.of(
                "contents", new Object[]{
                        Map.of(
                                "parts", new Object[]{
                                        Map.of("text", prompt)
                                }
                        )
                }
        );

        int keyIndex = keySlot.getIndex();

        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path(GENERATE_CONTENT_PATH)
                        .queryParam("key", keySlot.getApiKey())
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .exchangeToMono(response -> {
                    if (response.statusCode().is2xxSuccessful()) {
                        return response.bodyToMono(Map.class).map(this::extractAssistantText);
                    }
                    return response.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .flatMap(errorBody -> Mono.error(
                                    new GeminiApiException(keyIndex, response.statusCode(), errorBody)));
                })
                .doOnSuccess(text -> log.debug("Gemini request succeeded using key {}.", keyIndex));
    }

    @SuppressWarnings("unchecked")
    private String extractAssistantText(Map<?, ?> response) {
        try {
            List<?> candidates = (List<?>) response.get("candidates");
            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content = (Map<?, ?>) candidate.get("content");
            List<?> parts = (List<?>) content.get("parts");
            Map<?, ?> part = (Map<?, ?>) parts.get(0);
            return part.get("text").toString();
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response payload.", e);
            return "Error processing response";
        }
    }
}

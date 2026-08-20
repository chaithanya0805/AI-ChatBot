package com.example.chatbot.service.gemini;

import com.example.chatbot.exception.GeminiApiException;
import com.example.chatbot.exception.GeminiUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@Slf4j
public class GeminiService {

    private static final String STREAM_GENERATE_CONTENT_PATH =
            "/v1beta/models/gemini-2.5-flash:streamGenerateContent";

    private final WebClient webClient;
    private final GeminiApiKeyManager keyManager;

    public GeminiService(GeminiApiKeyManager keyManager) {
        this.keyManager = keyManager;
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public Flux<ServerSentEvent<String>> streamGenerateContent(String prompt) {
        if (keyManager.getConfiguredKeyCount() == 0) {
            log.error("Gemini stream request rejected: no API keys configured.");
            return Flux.error(new GeminiUnavailableException());
        }

        return attemptStreamWithFailover(prompt, new HashSet<>());
    }

    private Flux<ServerSentEvent<String>> attemptStreamWithFailover(String prompt, Set<Integer> triedKeyIndices) {
        var keyOpt = keyManager.selectAvailableKey(triedKeyIndices);
        if (keyOpt.isEmpty()) {
            log.error("All configured Gemini API keys are unavailable or exhausted.");
            return Flux.error(new GeminiUnavailableException());
        }

        GeminiApiKeyManager.KeySlot keySlot = keyOpt.get();
        AtomicBoolean contentStarted = new AtomicBoolean(false);

        return callGeminiStream(prompt, keySlot)
                .doOnNext(chunk -> contentStarted.set(true))
                .map(chunk -> ServerSentEvent.<String>builder().data(chunk).build())
                .onErrorResume(error -> handleStreamFailure(
                        prompt,
                        triedKeyIndices,
                        keySlot,
                        error,
                        contentStarted.get()
                ));
    }

    private Flux<ServerSentEvent<String>> handleStreamFailure(
            String prompt,
            Set<Integer> triedKeyIndices,
            GeminiApiKeyManager.KeySlot failedKey,
            Throwable error,
            boolean contentStarted
    ) {
        if (contentStarted) {
            log.warn("Gemini stream interrupted after content started using key {}. Preserving partial response.",
                    failedKey.getIndex(), error);
            return Flux.empty();
        }

        if (!GeminiApiErrorClassifier.shouldFailover(error)) {
            log.error("Gemini stream failed with non-failover error using key {}.", failedKey.getIndex(), error);
            return Flux.error(error);
        }

        String reason = GeminiApiErrorClassifier.describeReason(error);
        keyManager.markUnavailable(failedKey.getIndex(), reason);

        Set<Integer> nextTried = new HashSet<>(triedKeyIndices);
        nextTried.add(failedKey.getIndex());

        if (nextTried.size() >= keyManager.getConfiguredKeyCount()) {
            log.error("All {} configured Gemini API keys failed for this stream request.",
                    keyManager.getConfiguredKeyCount());
            return Flux.error(new GeminiUnavailableException());
        }

        var nextKeyOpt = keyManager.selectAvailableKey(nextTried);
        if (nextKeyOpt.isEmpty()) {
            log.error("No additional Gemini API keys available after key {} stream failure.", failedKey.getIndex());
            return Flux.error(new GeminiUnavailableException());
        }

        keyManager.logSwitching(failedKey.getIndex(), nextKeyOpt.get().getIndex(), reason);
        return attemptStreamWithFailover(prompt, nextTried);
    }

    private Flux<String> callGeminiStream(String prompt, GeminiApiKeyManager.KeySlot keySlot) {
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
        log.info("[Gemini] stream request started using key slot {}", keyIndex);

        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path(STREAM_GENERATE_CONTENT_PATH)
                        .queryParam("key", keySlot.getApiKey())
                        .queryParam("alt", "sse")
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .exchangeToFlux(response -> {
                    log.info("[Gemini] stream response status: {}", response.statusCode());
                    if (response.statusCode().is2xxSuccessful()) {
                        Flux<DataBuffer> bodyFlux = response.bodyToFlux(DataBuffer.class);
                        java.util.concurrent.atomic.AtomicInteger chunkCount = new java.util.concurrent.atomic.AtomicInteger(0);
                        java.util.concurrent.atomic.AtomicInteger charCount = new java.util.concurrent.atomic.AtomicInteger(0);

                        return GeminiStreamChunkParser.parseSseStream(bodyFlux)
                                .doOnNext(chunk -> {
                                    chunkCount.incrementAndGet();
                                    charCount.addAndGet(chunk.length());
                                })
                                .doOnComplete(() -> log.info("[Gemini] stream completed. Chunks: {}, characters: {}", 
                                        chunkCount.get(), charCount.get()));
                    }

                    return response.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .flatMapMany(errorBody -> Flux.error(
                                    new GeminiApiException(keyIndex, response.statusCode(), errorBody)));
                });
    }
}

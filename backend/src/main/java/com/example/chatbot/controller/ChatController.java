package com.example.chatbot.controller;

import com.example.chatbot.dto.ChatRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    private final WebClient webClient;

    @Value("${gemini.api.key}")
    private String apiKey;

    public ChatController() {
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    @PostMapping("/ask")
    public Mono<String> askChat(@Valid @RequestBody ChatRequest request) {

        Map<String, Object> body = Map.of(
                "contents", new Object[]{
                        Map.of(
                                "parts", new Object[]{
                                        Map.of("text", request.getPrompt())
                                }
                        )
                }
        );

       return webClient.post()
    .uri(uriBuilder -> uriBuilder
        .path("/v1/models/gemini-2.5-flash:generateContent")
        .queryParam("key", apiKey)
        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    try {
                        var candidates = (java.util.List<?>) response.get("candidates");
                        var candidate = (Map<?, ?>) candidates.get(0);

                        var content = (Map<?, ?>) candidate.get("content");
                        var parts = (java.util.List<?>) content.get("parts");

                        var part = (Map<?, ?>) parts.get(0);

                        return part.get("text").toString();

                    } catch (Exception e) {
                        return "Error processing response";
                    }
                });
    }
}
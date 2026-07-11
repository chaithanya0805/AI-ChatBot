package com.example.chatbot.controller;

import com.example.chatbot.model.ChatMessage;
import com.example.chatbot.model.ChatSession;
import com.example.chatbot.service.ChatHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/chats")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;

    @GetMapping
    public Mono<ResponseEntity<Object>> getAllChats() {
        return Mono.fromCallable(() -> ResponseEntity.<Object>ok(chatHistoryService.getAllChats()))
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(e -> Mono.just(
                        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body((Object) e.getMessage())
                ));
    }

    @PostMapping
    public Mono<ResponseEntity<Object>> saveChat(@RequestBody ChatSession session) {

        System.out.println("====================================");
        System.out.println("Session ID : " + session.getSessionId());
        System.out.println("Title      : " + session.getTitle());

        if (session.getMessages() != null) {
            System.out.println("Messages Count : " + session.getMessages().size());

            for (ChatMessage msg : session.getMessages()) {
                System.out.println(msg.getRole() + " : " + msg.getContent());
            }
        }

        return Mono.fromCallable(() ->
                        ResponseEntity.<Object>ok(chatHistoryService.saveChatSession(session)))
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(e -> Mono.just(
                        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body((Object) e.getMessage())
                ));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Object>> deleteChat(@PathVariable String id) {
        return Mono.fromRunnable(() -> chatHistoryService.deleteChatSession(id))
                .subscribeOn(Schedulers.boundedElastic())
                .then(Mono.just(ResponseEntity.<Object>ok().build()))
                .onErrorResume(e -> Mono.just(
                        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body((Object) e.getMessage())
                ));
    }

    @DeleteMapping
    public Mono<ResponseEntity<Object>> deleteAllChats() {
        return Mono.fromRunnable(chatHistoryService::deleteAllChats)
                .subscribeOn(Schedulers.boundedElastic())
                .then(Mono.just(ResponseEntity.<Object>ok().build()))
                .onErrorResume(e -> Mono.just(
                        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body((Object) e.getMessage())
                ));
    }
}
package com.example.chatbot.controller;

import com.example.chatbot.model.ChatSession;
import com.example.chatbot.model.User;
import com.example.chatbot.service.ChatHistoryService;
import com.example.chatbot.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.security.Principal;

@RestController
@RequestMapping("/api/chats")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;
    private final UserService userService;

    @GetMapping
    public Mono<ResponseEntity<Object>> getAllChats(Principal principal) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.<Object>ok(chatHistoryService.getAllChatsOfUser(user));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> Mono.just(
                ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body((Object) e.getMessage())
        ));
    }

    @PostMapping
    public Mono<ResponseEntity<Object>> saveChat(Principal principal, @RequestBody ChatSession session) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.<Object>ok(chatHistoryService.saveChatSession(session, user));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
            if (e instanceof AccessDeniedException) {
                status = HttpStatus.FORBIDDEN;
            }
            return Mono.just(
                    ResponseEntity.status(status)
                            .body((Object) e.getMessage())
            );
        });
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Object>> deleteChat(Principal principal, @PathVariable String id) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            chatHistoryService.deleteChatSession(id, user);
            return ResponseEntity.<Object>ok().build();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
            if (e instanceof AccessDeniedException) {
                status = HttpStatus.FORBIDDEN;
            }
            return Mono.just(
                    ResponseEntity.status(status)
                            .body((Object) e.getMessage())
            );
        });
    }

    @DeleteMapping
    public Mono<ResponseEntity<Object>> deleteAllChats(Principal principal) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            chatHistoryService.deleteAllChatsOfUser(user);
            return ResponseEntity.<Object>ok().build();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> Mono.just(
                ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body((Object) e.getMessage())
        ));
    }
}
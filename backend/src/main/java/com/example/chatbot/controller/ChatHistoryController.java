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

import lombok.extern.slf4j.Slf4j;
import java.security.Principal;

@RestController
@RequestMapping("/api/chats")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
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
    public Mono<ResponseEntity<Object>> saveChat(Principal principal, @RequestBody ChatSession session, org.springframework.web.server.ServerWebExchange exchange) {
        String requestId = exchange.getAttributeOrDefault("requestId", "UNKNOWN");
        String threadName = Thread.currentThread().getName();
        log.info("[Controller] [REQ: {}] [THREAD: {}] Entered saveChat. SessionId: {}, UserPrincipal: {}", 
                requestId, threadName, session.getSessionId(), principal != null ? principal.getName() : "null");

        if (principal == null) {
            log.warn("[Controller] [REQ: {}] [THREAD: {}] Unauthorized access attempt to saveChat (Principal is null)", requestId, threadName);
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String callbackThreadName = Thread.currentThread().getName();
            log.info("[Controller] [REQ: {}] [THREAD: {}] Executing saveChat Callable", requestId, callbackThreadName);
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            ChatSession saved = chatHistoryService.saveChatSession(session, user, requestId);
            
            log.info("[Controller] [REQ: {}] [THREAD: {}] saveChat Callable finished. Returning 200 OK", requestId, callbackThreadName);
            return ResponseEntity.<Object>ok(saved);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            String errorThreadName = Thread.currentThread().getName();
            log.error("[Controller] [REQ: {}] [THREAD: {}] Exception in saveChat WebFlux pipeline: {} - {}", 
                    requestId, errorThreadName, e.getClass().getName(), e.getMessage(), e);
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
    public Mono<ResponseEntity<Object>> deleteChat(Principal principal, @PathVariable String id, org.springframework.web.server.ServerWebExchange exchange) {
        String requestId = exchange.getAttributeOrDefault("requestId", "UNKNOWN");
        String threadName = Thread.currentThread().getName();
        log.info("[Controller] [REQ: {}] [THREAD: {}] Entered deleteChat. SessionId: {}, UserPrincipal: {}", 
                requestId, threadName, id, principal != null ? principal.getName() : "null");

        if (principal == null) {
            log.warn("[Controller] [REQ: {}] [THREAD: {}] Unauthorized access attempt to deleteChat (Principal is null)", requestId, threadName);
            return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        }

        return Mono.fromCallable(() -> {
            String callbackThreadName = Thread.currentThread().getName();
            log.info("[Controller] [REQ: {}] [THREAD: {}] Executing deleteChat Callable", requestId, callbackThreadName);
            String email = principal.getName();
            User user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            chatHistoryService.deleteChatSession(id, user, requestId);
            
            log.info("[Controller] [REQ: {}] [THREAD: {}] deleteChat Callable finished. Returning 200 OK", requestId, callbackThreadName);
            return ResponseEntity.<Object>ok().build();
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorResume(e -> {
            String errorThreadName = Thread.currentThread().getName();
            log.error("[Controller] [REQ: {}] [THREAD: {}] Exception in deleteChat WebFlux pipeline: {} - {}", 
                    requestId, errorThreadName, e.getClass().getName(), e.getMessage(), e);
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
package com.example.chatbot.service.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
public final class GeminiStreamChunkParser {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private GeminiStreamChunkParser() {
    }

    public static Flux<String> parseSseStream(Flux<DataBuffer> body) {
        return body
                .map(GeminiStreamChunkParser::readBuffer)
                .scan(new ParseResult("", List.of()), (prev, chunk) -> {
                    StringBuilder sb = new StringBuilder(prev.remainingLineBuffer);
                    sb.append(chunk);
                    String accumulated = sb.toString();

                    List<String> deltas = new ArrayList<>();
                    int lastNewlineIndex = -1;

                    // Find the last line break (either \n or \r)
                    for (int i = 0; i < accumulated.length(); i++) {
                        char c = accumulated.charAt(i);
                        if (c == '\n' || c == '\r') {
                            lastNewlineIndex = i;
                        }
                    }

                    String linesToProcess = "";
                    String remaining = accumulated;
                    if (lastNewlineIndex != -1) {
                        linesToProcess = accumulated.substring(0, lastNewlineIndex + 1);
                        remaining = accumulated.substring(lastNewlineIndex + 1);
                    }

                    if (!linesToProcess.isEmpty()) {
                        // Split into individual lines to process
                        String[] lines = linesToProcess.split("\\r?\\n");
                        for (String line : lines) {
                            String trimmed = line.trim();
                            if (!trimmed.isEmpty() && !trimmed.startsWith(":")) {
                                String payload = trimmed;
                                if (trimmed.startsWith("data:")) {
                                    payload = trimmed.substring(5).trim();
                                }
                                if (!payload.isEmpty() && !"[DONE]".equals(payload)) {
                                    extractText(payload).ifPresent(deltas::add);
                                }
                            }
                        }
                    }

                    return new ParseResult(remaining, deltas);
                })
                .flatMapIterable(ParseResult::getNewDeltas);
    }

    private static String readBuffer(DataBuffer buffer) {
        try {
            byte[] bytes = new byte[buffer.readableByteCount()];
            buffer.read(bytes);
            return new String(bytes, StandardCharsets.UTF_8);
        } finally {
            DataBufferUtils.release(buffer);
        }
    }

    private static Optional<String> extractText(String payload) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(payload);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return Optional.empty();
            }

            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                return Optional.empty();
            }

            JsonNode textNode = parts.get(0).path("text");
            if (textNode.isMissingNode() || textNode.isNull()) {
                return Optional.empty();
            }

            String text = textNode.asText("");
            return StringUtils.hasText(text)
                    ? Optional.of(text)
                    : Optional.empty();
        } catch (Exception ex) {
            log.debug("Skipping unparsable Gemini stream payload.", ex);
            return Optional.empty();
        }
    }

    private static final class ParseResult {
        private final String remainingLineBuffer;
        private final List<String> newDeltas;

        ParseResult(String remainingLineBuffer, List<String> newDeltas) {
            this.remainingLineBuffer = remainingLineBuffer;
            this.newDeltas = newDeltas;
        }

        String getRemainingLineBuffer() {
            return remainingLineBuffer;
        }

        List<String> getNewDeltas() {
            return newDeltas;
        }
    }
}

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

@Slf4j
public final class GeminiStreamChunkParser {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private GeminiStreamChunkParser() {
    }

    public static Flux<String> parseSseStream(Flux<DataBuffer> body) {
        return body
                .map(GeminiStreamChunkParser::readBuffer)
                .scan(new ParseState(), ParseState::append)
                .concatMap(ParseState::drainTextDeltas);
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

    static ParseState append(ParseState state, String chunk) {
        return state.append(chunk);
    }

    static final class ParseState {
        private final StringBuilder lineBuffer = new StringBuilder();
        private final List<String> pendingDeltas = new ArrayList<>();

        ParseState append(String chunk) {
            lineBuffer.append(chunk);

            int newlineIndex;
            while ((newlineIndex = indexOfLineBreak(lineBuffer)) >= 0) {
                String line = lineBuffer.substring(0, newlineIndex).trim();
                int breakLength = lineBuffer.charAt(newlineIndex) == '\r'
                        && newlineIndex + 1 < lineBuffer.length()
                        && lineBuffer.charAt(newlineIndex + 1) == '\n'
                        ? 2
                        : 1;
                lineBuffer.delete(0, newlineIndex + breakLength);
                processLine(line);
            }

            return this;
        }

        Flux<String> drainTextDeltas() {
            if (pendingDeltas.isEmpty()) {
                return Flux.empty();
            }
            List<String> deltas = List.copyOf(pendingDeltas);
            pendingDeltas.clear();
            return Flux.fromIterable(deltas);
        }

        private void processLine(String line) {
            if (!StringUtils.hasText(line) || line.startsWith(":")) {
                return;
            }

            String payload = line;
            if (line.startsWith("data:")) {
                payload = line.substring(5).trim();
            }

            if (!StringUtils.hasText(payload) || "[DONE]".equals(payload)) {
                return;
            }

            extractText(payload).ifPresent(pendingDeltas::add);
        }

        private static int indexOfLineBreak(StringBuilder builder) {
            for (int i = 0; i < builder.length(); i++) {
                char c = builder.charAt(i);
                if (c == '\n' || c == '\r') {
                    return i;
                }
            }
            return -1;
        }

        private static java.util.Optional<String> extractText(String payload) {
            try {
                JsonNode root = OBJECT_MAPPER.readTree(payload);
                JsonNode candidates = root.path("candidates");
                if (!candidates.isArray() || candidates.isEmpty()) {
                    return java.util.Optional.empty();
                }

                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (!parts.isArray() || parts.isEmpty()) {
                    return java.util.Optional.empty();
                }

                JsonNode textNode = parts.get(0).path("text");
                if (textNode.isMissingNode() || textNode.isNull()) {
                    return java.util.Optional.empty();
                }

                String text = textNode.asText("");
                return StringUtils.hasText(text)
                        ? java.util.Optional.of(text)
                        : java.util.Optional.empty();
            } catch (Exception ex) {
                log.debug("Skipping unparsable Gemini stream payload.", ex);
                return java.util.Optional.empty();
            }
        }
    }
}

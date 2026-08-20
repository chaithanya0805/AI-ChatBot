package com.example.chatbot.service.gemini;

import com.example.chatbot.config.GeminiApiProperties;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class GeminiApiKeyManager {

    private final GeminiApiProperties properties;
    private final List<KeySlot> keySlots = new ArrayList<>();

    public GeminiApiKeyManager(GeminiApiProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        registerKey(1, firstNonBlank(properties.getKey1(), properties.getKey()));
        registerKey(2, properties.getKey2());
        registerKey(3, properties.getKey3());
        registerKey(4, properties.getKey4());
        registerKey(5, properties.getKey5());

        if (keySlots.isEmpty()) {
            log.warn("No Gemini API keys configured. Set GEMINI_API_KEY_1 (or legacy GEMINI_API_KEY) through GEMINI_API_KEY_5.");
        } else {
            log.info("Gemini API key manager initialized with {} configured key(s). Cooldown: {}s.",
                    keySlots.size(), properties.getKeyCooldownSeconds());
        }
    }

    public int getConfiguredKeyCount() {
        return keySlots.size();
    }

    /**
     * Returns the lowest-index key that is eligible and not in {@code excludeIndices}.
     */
    public Optional<KeySlot> selectAvailableKey(Set<Integer> excludeIndices) {
        for (KeySlot slot : keySlots) {
            if (excludeIndices.contains(slot.getIndex())) {
                continue;
            }
            if (slot.isEligible()) {
                return Optional.of(slot);
            }
        }
        return Optional.empty();
    }

    public void markUnavailable(int keyIndex, String reason) {
        keySlots.stream()
                .filter(slot -> slot.getIndex() == keyIndex)
                .findFirst()
                .ifPresent(slot -> {
                    long cooldownMillis = properties.getKeyCooldownSeconds() * 1000L;
                    slot.markUnavailable(cooldownMillis);
                    log.warn("Gemini API key {} marked unavailable ({}) until cooldown expires ({}s).",
                            keyIndex, reason, properties.getKeyCooldownSeconds());
                });
    }

    public void logSwitching(int fromKeyIndex, int toKeyIndex, String reason) {
        log.warn("Gemini API key {} failed due to {}. Switching to Gemini API key {}.",
                fromKeyIndex, reason, toKeyIndex);
    }

    private void registerKey(int index, String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }
        keySlots.add(new KeySlot(index, apiKey.trim()));
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    @Getter
    public static final class KeySlot {
        private final int index;
        private final String apiKey;
        private final AtomicLong unavailableUntilMillis = new AtomicLong(0);

        KeySlot(int index, String apiKey) {
            this.index = index;
            this.apiKey = apiKey;
        }

        boolean isEligible() {
            long until = unavailableUntilMillis.get();
            if (until == 0L) {
                return true;
            }
            long now = System.currentTimeMillis();
            if (now >= until) {
                unavailableUntilMillis.compareAndSet(until, 0L);
                log.info("Gemini API key {} cooldown expired; key is eligible again.", index);
                return true;
            }
            return false;
        }

        void markUnavailable(long cooldownMillis) {
            unavailableUntilMillis.set(System.currentTimeMillis() + cooldownMillis);
        }

        /** Visible for tests. */
        long getUnavailableUntilMillis() {
            return unavailableUntilMillis.get();
        }
    }

    /** Visible for tests. */
    List<KeySlot> getKeySlotsView() {
        return Collections.unmodifiableList(keySlots);
    }
}

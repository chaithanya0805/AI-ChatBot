package com.example.chatbot.service.gemini;

import com.example.chatbot.config.GeminiApiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeminiApiKeyManagerTest {

    private GeminiApiProperties properties;
    private GeminiApiKeyManager keyManager;

    @BeforeEach
    void setUp() {
        properties = new GeminiApiProperties();
        properties.setKey1("key-one");
        properties.setKey2("key-two");
        properties.setKey3("key-three");
        properties.setKeyCooldownSeconds(60);
        keyManager = new GeminiApiKeyManager(properties);
        keyManager.init();
    }

    @Test
    void selectsLowestAvailableKey() {
        var selected = keyManager.selectAvailableKey(Set.of());
        assertTrue(selected.isPresent());
        assertEquals(1, selected.get().getIndex());
    }

    @Test
    void skipsUnavailableKeysAndFailsOverToNext() {
        keyManager.markUnavailable(1, "quota/rate limit");

        var selected = keyManager.selectAvailableKey(Set.of());
        assertTrue(selected.isPresent());
        assertEquals(2, selected.get().getIndex());
    }

    @Test
    void excludesAlreadyTriedKeysInSameRequest() {
        Set<Integer> tried = new HashSet<>();
        tried.add(1);

        var selected = keyManager.selectAvailableKey(tried);
        assertTrue(selected.isPresent());
        assertEquals(2, selected.get().getIndex());
    }

    @Test
    void returnsEmptyWhenAllKeysUnavailable() {
        keyManager.markUnavailable(1, "quota/rate limit");
        keyManager.markUnavailable(2, "quota/rate limit");
        keyManager.markUnavailable(3, "quota/rate limit");

        assertTrue(keyManager.selectAvailableKey(Set.of()).isEmpty());
    }

    @Test
    void keyBecomesEligibleAfterCooldownExpires() throws InterruptedException {
        properties.setKeyCooldownSeconds(1);
        keyManager = new GeminiApiKeyManager(properties);
        keyManager.init();

        keyManager.markUnavailable(1, "quota/rate limit");
        assertFalse(keyManager.selectAvailableKey(Set.of()).get().getIndex() == 1);

        Thread.sleep(1100L);

        var selected = keyManager.selectAvailableKey(Set.of());
        assertTrue(selected.isPresent());
        assertEquals(1, selected.get().getIndex());
    }

    @Test
    void ignoresBlankKeysGracefully() {
        properties = new GeminiApiProperties();
        properties.setKey1("only-key");
        properties.setKey2("   ");
        properties.setKey3(null);
        keyManager = new GeminiApiKeyManager(properties);
        keyManager.init();

        assertEquals(1, keyManager.getConfiguredKeyCount());
    }

    @Test
    void usesLegacySingleKeyFallbackForSlotOne() {
        properties = new GeminiApiProperties();
        properties.setKey("legacy-key");
        keyManager = new GeminiApiKeyManager(properties);
        keyManager.init();

        assertEquals(1, keyManager.getConfiguredKeyCount());
        assertEquals(1, keyManager.selectAvailableKey(Set.of()).get().getIndex());
    }
}

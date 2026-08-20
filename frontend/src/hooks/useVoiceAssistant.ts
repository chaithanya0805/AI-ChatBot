import { useState, useEffect, useCallback, useRef } from 'react';

// Modern Web Speech API interfaces
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Helper function to clean markdown formatting before Speech Synthesis speaks the text
const cleanMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  // Remove code blocks (fenced code)
  let text = markdown.replace(/```[a-zA-Z0-9+#-]*\n?/g, '');

  // Remove inline code backticks
  text = text.replace(/`/g, '');

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Handle markdown links: [text](url) -> text
  text = text.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Handle images: ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove headings markers at the start of lines: #, ##, etc.
  text = text.replace(/^#+\s+/gm, '');

  // Remove blockquote characters at the start of lines: >
  text = text.replace(/^>\s+/gm, '');

  // Remove bullet points / list markers: -, *, + at the start of lines
  text = text.replace(/^[ \t]*[-*+]\s+/gm, '');

  // Remove bold and italic markers: **, *, __, _ without crossing lines
  text = text.replace(/\*\*([^\*\n]+)\*\*/g, '$1');
  text = text.replace(/\*([^\*\n]+)\*/g, '$1');
  text = text.replace(/__([^_\n]+)__/g, '$1');
  text = text.replace(/_([^_\n]+)_/g, '$1');

  // Process line by line to handle punctuation, extra whitespace, and line breaks
  const lines = text.split('\n');
  const processedLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Append period if the line doesn't end with standard sentence-ending punctuation or pauses
      if (!/[.!?,;:?]$/.test(line)) {
        return line + '.';
      }
      return line;
    });

  // Join lines with a space and clean up any multiple spaces
  return processedLines.join(' ').replace(/\s+/g, ' ').trim();
};

export const useVoiceAssistant = (onSpeechResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const onSpeechResultRef = useRef(onSpeechResult);

  // Active session tracking to invalidate late/stale callbacks
  const ttsSessionIdRef = useRef<number>(0);
  const recognitionSessionIdRef = useRef<number>(0);

  // Update ref to avoid stale closures in event handlers
  onSpeechResultRef.current = onSpeechResult;

  if (!recognitionRef.current && SpeechRecognition) {
    const rec = new SpeechRecognition();
    // Non-continuous recording: only capture voice input when the user explicitly triggers it.
    // This resolves issues with mobile browsers and makes recording robust across platforms.
    rec.continuous = false;
    rec.interimResults = true;
    // Using en-IN handles Indian accent English and code-switched Telugu words better natively
    rec.lang = 'en-IN';
    recognitionRef.current = rec;
  }
  const recognition = recognitionRef.current;

  useEffect(() => {
    // Load voices robustly
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string) => {
    console.log("[useVoiceAssistant] speak() entered with text:", text);
    if (isMuted || !window.speechSynthesis) {
      console.log("[useVoiceAssistant] speak() early return. isMuted:", isMuted, "hasSynthesis:", !!window.speechSynthesis);
      return;
    }

    console.log("[useVoiceAssistant] calling speechSynthesis.cancel()");
    window.speechSynthesis.cancel(); // Stop any ongoing speech

    // Invalidate callbacks from previous TTS sessions
    const currentTtsSession = ++ttsSessionIdRef.current;

    const cleanedText = cleanMarkdown(text);
    if (!cleanedText) {
      console.log("[useVoiceAssistant] speak() early return: cleanedText is empty");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Find the best available male voice that sounds natural for Indian English.
    // We prioritize premium voices if available in the browser natively.
    const bestVoice = 
      voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.name.includes('Microsoft Ravi') && v.lang.includes('en-IN')) || // Good Indian English male
      voices.find(v => v.lang === 'te-IN' && v.name.includes('Male')) || // Native Telugu male if available
      voices.find(v => v.lang === 'en-IN' && v.name.includes('Male')) ||
      voices.find(v => v.lang === 'en-GB' && v.name.includes('Male')) ||
      voices[0];
                     
    if (bestVoice) {
      console.log("[useVoiceAssistant] selected voice:", bestVoice.name);
      utterance.voice = bestVoice;
    } else {
      console.log("[useVoiceAssistant] no voice selected (using system default)");
    }

    // Tweak pitch and rate for a calm, intelligent JARVIS vibe
    utterance.pitch = 0.85; 
    utterance.rate = 0.95;  
    
    utterance.onstart = () => {
      if (currentTtsSession !== ttsSessionIdRef.current) return;
      console.log("[useVoiceAssistant] utterance.onstart fired!");
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (currentTtsSession !== ttsSessionIdRef.current) return;
      console.log("[useVoiceAssistant] utterance.onend fired!");
      setIsSpeaking(false);
    };
    utterance.onerror = (e: any) => {
      if (currentTtsSession !== ttsSessionIdRef.current) return;
      console.log("[useVoiceAssistant] utterance.onerror fired! error event details:", e.error);
      setIsSpeaking(false);
    };

    console.log("[useVoiceAssistant] calling speechSynthesis.speak(utterance)");
    window.speechSynthesis.speak(utterance);
  }, [voices, isMuted]);

  const stopSpeaking = useCallback(() => {
    // Invalidate current TTS callbacks
    ttsSessionIdRef.current++;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  const startListening = useCallback(() => {
    setVoiceError(null);
    transcriptRef.current = '';

    // 1. Forcefully abort any active SpeechRecognition instance to avoid overlap/stale events
    if (recognition) {
      try {
        recognition.abort();
      } catch (e) {
        console.warn("[useVoiceAssistant] Error aborting recognition:", e);
      }
    }

    // 2. Invalidate any active/queued SpeechSynthesis (TTS) and stop sound immediately
    ttsSessionIdRef.current++;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    if (!window.isSecureContext) {
      const secureError = "Speech Recognition requires a secure context (HTTPS) on mobile devices. Please ensure the app is accessed over HTTPS.";
      console.error("[useVoiceAssistant]", secureError);
      setVoiceError(secureError);
      setIsListening(false);
      return;
    }

    if (!recognition) {
      const supportError = "Speech Recognition is not supported or initialized in this browser.";
      console.error("[useVoiceAssistant]", supportError);
      setVoiceError(supportError);
      setIsListening(false);
      return;
    }
    
    // Invalidate callbacks from previous recognition runs
    const currentRecSession = ++recognitionSessionIdRef.current;

    try {
      // Allow audio hardware state transitions (TTS stop -> Microphone start) to complete safely
      setTimeout(() => {
        if (currentRecSession !== recognitionSessionIdRef.current) return;
        try {
          recognition.start();
          setIsListening(true);
        } catch (e: any) {
          console.error("[useVoiceAssistant] start exception inside timeout:", e);
          setVoiceError(e?.message || "Failed to start speech recognition.");
          setIsListening(false);
        }
      }, 100);
      
      recognition.onresult = (event: any) => {
        if (currentRecSession !== recognitionSessionIdRef.current) return;

        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        transcriptRef.current = transcript.trim();

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Auto-submit after 1.5s of silence as a fallback helper
        silenceTimeoutRef.current = setTimeout(() => {
          if (currentRecSession !== recognitionSessionIdRef.current) return;
          const text = transcriptRef.current;
          if (text) {
            onSpeechResultRef.current(text);
            transcriptRef.current = '';
          }
          recognition.stop();
        }, 1500);
      };

      recognition.onerror = (event: any) => {
        if (currentRecSession !== recognitionSessionIdRef.current) return;
        
        console.error("[useVoiceAssistant] onerror event:", event);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        let errorMsg = "An error occurred during speech recognition.";
        if (event.error === 'not-allowed') {
          errorMsg = "Microphone access denied. Please grant microphone permission in your browser/system settings.";
        } else if (event.error === 'service-not-allowed') {
          errorMsg = "Speech recognition service is not allowed/supported. Please check your system settings or enable Siri/dictation.";
        } else if (event.error === 'no-speech') {
          errorMsg = "No speech detected. Please try speaking again.";
        } else if (event.error) {
          errorMsg = `Speech recognition error: ${event.error}`;
        }
        
        // Show non-allowed and service-not-allowed errors in the UI.
        // Avoid showing 'no-speech' error in a loud warning banner.
        if (event.error !== 'no-speech') {
          setVoiceError(errorMsg);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (currentRecSession !== recognitionSessionIdRef.current) return;

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        // When recognition ends (either manually stopped or automatically on silence),
        // we submit the final transcript if it exists.
        const finalTranscript = transcriptRef.current;
        if (finalTranscript) {
          onSpeechResultRef.current(finalTranscript);
          transcriptRef.current = '';
        }
        setIsListening(false);
      };
    } catch (e: any) {
      console.error("[useVoiceAssistant] start exception:", e);
      setVoiceError(e?.message || "Failed to start speech recognition.");
      setIsListening(false);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    // Invalidate callbacks from the stopped session
    recognitionSessionIdRef.current++;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setIsListening(false);
    }
  }, [recognition]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) stopSpeaking();
      return !prev;
    });
  }, [stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isMuted,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleMute,
    hasRecognition: !!recognition,
    voiceError,
    clearVoiceError
  };
};

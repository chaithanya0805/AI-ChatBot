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
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const onSpeechResultRef = useRef(onSpeechResult);

  // Update ref to avoid stale closures in event handlers
  onSpeechResultRef.current = onSpeechResult;

  if (!recognitionRef.current && SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.continuous = true;
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
      console.log("[useVoiceAssistant] utterance.onstart fired!");
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log("[useVoiceAssistant] utterance.onend fired!");
      setIsSpeaking(false);
    };
    utterance.onerror = (e: any) => {
      console.log("[useVoiceAssistant] utterance.onerror fired! error event details:", e.error);
      setIsSpeaking(false);
    };

    console.log("[useVoiceAssistant] calling speechSynthesis.speak(utterance)");
    window.speechSynthesis.speak(utterance);
  }, [voices, isMuted]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      
      // TEMP DEBUG LOGS
      recognition.onstart = () => {
        console.log("[VOICE] onstart");
      };

      recognition.onresult = (event: any) => {
        console.log("[VOICE] onresult", event.results[0][0].transcript);
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        silenceTimeoutRef.current = setTimeout(() => {
          if (transcript.trim()) {
            onSpeechResultRef.current(transcript.trim());
          }
          recognition.stop();
        }, 1500); // Wait 1.5 seconds after user stops speaking to send the query
      };

      recognition.onerror = (event: any) => {
        console.error("[VOICE] onerror", event.error);
        console.error(event);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log("[VOICE] onend");
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setIsListening(false);
      };
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
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
    hasRecognition: !!recognition
  };
};

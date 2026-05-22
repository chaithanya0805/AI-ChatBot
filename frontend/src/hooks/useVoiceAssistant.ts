import { useState, useEffect, useCallback } from 'react';

// Modern Web Speech API interfaces
const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceAssistant = (onSpeechResult: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Initialize speech recognition
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;
  
  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    // Using en-IN handles Indian accent English and code-switched Telugu words better natively
    recognition.lang = 'en-IN';
  }

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
    if (isMuted || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find the best available male voice that sounds natural for Indian English / Telugu mix.
    // We prioritize premium voices if available in the browser natively.
    const bestVoice = 
      voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.name.includes('Microsoft Ravi') && v.lang.includes('en-IN')) || // Good Indian English male
      voices.find(v => v.lang === 'te-IN' && v.name.includes('Male')) || // Native Telugu male if available
      voices.find(v => v.lang === 'en-IN' && v.name.includes('Male')) ||
      voices.find(v => v.lang === 'en-GB' && v.name.includes('Male')) ||
      voices[0];
                     
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Tweak pitch and rate for a calm, intelligent JARVIS vibe
    utterance.pitch = 0.85; 
    utterance.rate = 0.95;  
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

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
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSpeechResult(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  }, [recognition, onSpeechResult]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
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

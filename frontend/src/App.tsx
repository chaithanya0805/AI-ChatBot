import React, { useState, useEffect, useRef } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { useChatStream } from './hooks/useChatStream';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { JarvisArcVisual } from './components/JarvisArcVisual';
import { Send, Mic, MicOff, Volume2, VolumeX, Activity, Cpu, Wifi, Square } from 'lucide-react';

type InputMode = 'text' | 'voice';

function App() {
  const { messages, sendMessage, isTyping } = useChatStream();
  const [input, setInput] = useState('');
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Track the mode of the current interaction
  const [lastInputMode, setLastInputMode] = useState<InputMode>('text');

  // Handle voice commands: automatically send when speech is recognized
  const handleSpeechResult = (transcript: string) => {
    setInput(transcript);
    setLastInputMode('voice');
    sendMessage(transcript);
  };

  const {
    isListening,
    isSpeaking,
    isMuted,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleMute,
    hasRecognition
  } = useVoiceAssistant(handleSpeechResult);

  // Update time widget
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Speak AI responses ONLY if the last input mode was 'voice'
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastInputMode === 'voice') {
        speak(lastMessage.content);
      }
    }
  }, [isTyping, messages, speak, lastInputMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    setLastInputMode('text');
    sendMessage(input);
    setInput('');
  };

  const toggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      setLastInputMode('voice');
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-jarvis-darker text-jarvis-cyan font-rajdhani relative overflow-hidden">

      {/* Background Arc Visual */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20">
        <JarvisArcVisual className="w-[800px] h-[800px] md:w-[1200px] md:h-[1200px]" isActive={isSpeaking || isTyping} />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

      {/* Scanline Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none animate-scan-line bg-gradient-to-b from-transparent via-jarvis-cyan/10 to-transparent opacity-20 h-32" />

      {/* Header / Top HUD */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-jarvis-cyan/20 glass-panel z-10">
        <div className="flex items-center gap-4 hud-border p-2">
          {/* Top Left Header Visual */}
          <div className="relative flex items-center justify-center w-16 h-16 bg-black/50 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <JarvisArcVisual className="w-14 h-14" isActive={isTyping || isSpeaking} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase text-white drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">J.A.R.V.I.S.</h1>
            <p className="text-xs tracking-widest text-jarvis-cyan/80 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse shadow-[0_0_5px_#00f0ff]"></span>
              System Online
            </p>
          </div>
        </div>

        {/* Diagnostics Top Right */}
        <div className="hidden md:flex items-center gap-6 text-xs tracking-widest font-mono text-jarvis-cyan/70">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span>CPU: {Math.floor(Math.random() * 20 + 20)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>MEM: {Math.floor(Math.random() * 10 + 40)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span>NET: STABLE</span>
          </div>
          <div className="text-jarvis-cyan border border-jarvis-cyan/30 px-3 py-1 rounded bg-jarvis-cyan/10">
            {time}
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 z-10 overflow-hidden relative">
        <ChatContainer messages={messages} isTyping={isTyping} />
      </div>

      {/* Input Area / Bottom HUD */}
      <div className="p-4 md:p-6 z-10 glass-panel border-t border-jarvis-cyan/20">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">

          {/* Audio Visualizer / Controls */}
          <div className="flex justify-between items-center px-4 mb-2 min-h-[24px]">
            <div className="flex items-center gap-4">
              {/* Only show voice controls if last interaction was voice or currently speaking */}
              {(lastInputMode === 'voice' || isSpeaking || isListening) && (
                <>
                  <button
                    onClick={toggleMute}
                    className="text-jarvis-cyan/70 hover:text-jarvis-cyan transition-colors"
                    title={isMuted ? "Unmute Voice" : "Mute Voice"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {isSpeaking && !isMuted && (
                    <button
                      onClick={stopSpeaking}
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs uppercase tracking-widest"
                      title="Stop Speaking"
                    >
                      <Square className="w-4 h-4" /> Stop
                    </button>
                  )}

                  {(isSpeaking || (isTyping && lastInputMode === 'voice')) && !isMuted && (
                    <div className="flex items-end gap-1 h-6 ml-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-jarvis-cyan rounded-t animate-wave"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                      <span className="text-[10px] font-mono tracking-widest ml-2 animate-pulse text-jarvis-cyan/70 uppercase">Audio Out</span>
                    </div>
                  )}

                  {isListening && (
                    <span className="text-[10px] font-mono tracking-widest ml-2 text-red-400 animate-pulse uppercase">Mic Active</span>
                  )}
                </>
              )}
            </div>

            <div className="text-[10px] font-mono tracking-widest uppercase">
              Mode: <span className={lastInputMode === 'voice' ? 'text-blue-400' : 'text-jarvis-cyan'}>{lastInputMode}</span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`relative flex items-center bg-black/50 border p-2 hud-border transition-all
              ${lastInputMode === 'voice'
                ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'border-jarvis-cyan/30 focus-within:border-jarvis-cyan focus-within:shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              }
            `}
          >
            {hasRecognition && (
              <button
                type="button"
                onClick={toggleListen}
                className={`p-3 mr-2 rounded-sm transition-all ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'text-jarvis-cyan/50 hover:text-jarvis-cyan hover:bg-jarvis-cyan/10'}`}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Awaiting command input..."}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-jarvis-cyan/40 py-3 font-mono text-sm tracking-wide"
              disabled={isTyping || isListening}
            />

            <button
              type="submit"
              disabled={!input.trim() || isTyping || isListening}
              className="p-3 bg-jarvis-cyan/20 text-jarvis-cyan hover:bg-jarvis-cyan hover:text-black border border-jarvis-cyan disabled:border-gray-700 disabled:text-gray-500 disabled:bg-transparent transition-all ml-2 flex items-center gap-2 uppercase tracking-widest text-sm font-bold"
            >
              <span className="hidden md:inline">Execute</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex justify-between items-center text-[10px] font-mono text-jarvis-cyan/50 tracking-widest mt-1 px-1">
            <span>SECURE CHANNEL ENCRYPTED</span>
            <span>v2.0.4 // STARK INDUSTRIES</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

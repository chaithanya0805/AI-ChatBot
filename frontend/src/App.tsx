import React, { useState } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { useChatStream } from './hooks/useChatStream';
import { Send, Bot, Sparkles } from 'lucide-react';

function App() {
  const { messages, sendMessage, isTyping } = useChatStream();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Nexus AI</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <ChatContainer messages={messages} isTyping={isTyping} />

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
        <form 
          onSubmit={handleSubmit} 
          className="max-w-4xl mx-auto relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all shadow-2xl"
        >
          <div className="p-3 text-gray-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Nexus AI..."
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500 py-3"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-colors ml-2 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">Nexus AI can make mistakes. Consider verifying critical information.</p>
      </div>
    </div>
  );
}

export default App;

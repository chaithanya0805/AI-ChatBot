import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatBubble } from './ChatBubble';
import type { Message } from '../hooks/useChatStream';

interface ChatContainerProps {
  messages: Message[];
  isTyping: boolean;
}

export const ChatContainer = ({ messages, isTyping }: ChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom smoothly when messages change
  useEffect(() => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      containerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth"
    >
      <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full pt-10 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 my-auto">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Nexus AI</h2>
            <p className="text-gray-400 max-w-md">Your ultra-modern AI assistant. How can I help you today?</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <ChatBubble 
                key={msg.id}
                id={msg.id}
                role={msg.role} 
                content={msg.content}
                // If it's the last assistant message and we're currently typing, apply shimmer/pulse
                isStreaming={isTyping && index === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

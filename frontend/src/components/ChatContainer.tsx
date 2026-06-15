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
      className="h-full overflow-y-auto px-4 py-6 md:px-8 scroll-smooth"
    >
      <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-center animate-fade-in">
            {/* Minimal Logo Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary text-white font-bold text-2xl flex items-center justify-center shadow-md mb-6 select-none">
              J
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
              How can I help you today?
            </h2>

            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mb-10">
              Ask Jarvis to answer questions, analyze documents, write code, or automate voice directives.
            </p>

            {/* Premium feature overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full text-left">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Explain concepts</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">"Explain quantum computing in simple terms for a beginner"</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Code & debug</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">"Write a Python script to scrape dates from log files"</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Brainstorm ideas</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">"Suggest 5 unique startup names combining AI and travel"</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Voice assistant</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Enable voice input for hands-free speech command execution</p>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                id={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ))}
            {isTyping && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <ChatBubble
                key="thinking-loader"
                id="thinking-loader"
                role="assistant"
                content=""
                isStreaming={true}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
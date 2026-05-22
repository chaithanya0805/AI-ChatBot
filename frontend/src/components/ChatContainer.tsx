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
      className="h-full overflow-y-auto p-4 md:p-8 scroll-smooth"
    >
      <div className="max-w-5xl mx-auto flex flex-col justify-end min-h-full pt-10 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-80 my-auto">
            <h2 className="text-3xl font-bold text-white mb-2 font-rajdhani tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
              J.A.R.V.I.S. Ready
            </h2>

            <p className="text-jarvis-cyan/60 max-w-md font-mono text-sm tracking-wider uppercase">
              Awaiting your directives, sir.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <ChatBubble
                key={msg.id}
                id={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={
                  isTyping &&
                  index === messages.length - 1 &&
                  msg.role === 'assistant'
                }
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
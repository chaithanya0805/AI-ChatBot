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

  // Reset container scroll position to top on initial component mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // Handle scroll offset adjustments based on message log updates
  useEffect(() => {
    if (containerRef.current) {
      if (messages.length === 0) {
        containerRef.current.scrollTop = 0;
      } else {
        const { scrollHeight, clientHeight } = containerRef.current;
        containerRef.current.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-6 sm:py-4 md:px-8 scroll-smooth min-h-0"
    >
      <div className="max-w-[900px] w-full mx-auto flex flex-col justify-end min-h-full pb-2 sm:pb-4 min-w-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto py-6 sm:py-8 md:py-12 short:py-4 text-center animate-fade-in relative w-full min-h-0 px-1">
            {/* Very soft radial glow behind the Jarvis logo and hero section */}
            <div className="absolute top-0 w-[min(20rem,80vw)] h-[min(20rem,50vh)] bg-[radial-gradient(circle,rgba(212,175,106,0.06),transparent_65%)] pointer-events-none z-0 animate-pulse" />
            
            <div className="z-10 flex flex-col items-center w-full">
              {/* Minimal Logo Icon */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-extrabold text-lg sm:text-xl flex items-center justify-center shadow-xs mb-4 sm:mb-6 select-none hover:scale-[0.98] transition-transform duration-200">
                J
              </div>
              
              <h2 className="font-bold text-slate-800 dark:text-[#F5F5F5] mb-2 sm:mb-3 tracking-tight text-[clamp(1.25rem,3vw+0.5rem,2.25rem)] px-2">
                How can I help you today?
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9A9A9A] max-w-md mb-5 sm:mb-8 leading-relaxed px-3 short:hidden">
                Ask Jarvis to answer questions, analyze documents, write code, or automate voice directives.
              </p>
            </div>

            {/* Premium feature overview cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-3.5 max-w-2xl w-full text-left z-10 short:hidden">
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#181818] hover:-translate-y-[3px] hover:border-slate-350 dark:hover:border-[#D4AF6A]/80 hover:bg-slate-50/50 dark:hover:bg-[#1E1E1E] hover:shadow-md transition-all duration-300 ease-out cursor-pointer flex flex-col justify-center min-h-[96px] sm:min-h-[112px] h-auto py-3 sm:py-4 group">
                <h3 className="font-semibold text-sm text-slate-850 dark:text-[#F5F5F5] mb-1 sm:mb-1.5 group-hover:text-[#D4AF6A] transition-colors">Explain concepts</h3>
                <p className="text-xs text-slate-500 dark:text-[#CFCFCF] leading-relaxed font-normal">"Explain quantum computing in simple terms for a beginner"</p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#181818] hover:-translate-y-[3px] hover:border-slate-350 dark:hover:border-[#D4AF6A]/80 hover:bg-slate-50/50 dark:hover:bg-[#1E1E1E] hover:shadow-md transition-all duration-300 ease-out cursor-pointer flex flex-col justify-center min-h-[96px] sm:min-h-[112px] h-auto py-3 sm:py-4 group">
                <h3 className="font-semibold text-sm text-slate-850 dark:text-[#F5F5F5] mb-1 sm:mb-1.5 group-hover:text-[#D4AF6A] transition-colors">Code & debug</h3>
                <p className="text-xs text-slate-500 dark:text-[#CFCFCF] leading-relaxed font-normal">"Write a Python script to scrape dates from log files"</p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#181818] hover:-translate-y-[3px] hover:border-slate-350 dark:hover:border-[#D4AF6A]/80 hover:bg-slate-50/50 dark:hover:bg-[#1E1E1E] hover:shadow-md transition-all duration-300 ease-out cursor-pointer flex flex-col justify-center min-h-[96px] sm:min-h-[112px] h-auto py-3 sm:py-4 group">
                <h3 className="font-semibold text-sm text-slate-850 dark:text-[#F5F5F5] mb-1 sm:mb-1.5 group-hover:text-[#D4AF6A] transition-colors">Brainstorm ideas</h3>
                <p className="text-xs text-slate-500 dark:text-[#CFCFCF] leading-relaxed font-normal">"Suggest 5 unique startup names combining AI and travel"</p>
              </div>
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#2A2A2A] bg-white dark:bg-[#181818] hover:-translate-y-[3px] hover:border-slate-350 dark:hover:border-[#D4AF6A]/80 hover:bg-slate-50/50 dark:hover:bg-[#1E1E1E] hover:shadow-md transition-all duration-300 ease-out cursor-pointer flex flex-col justify-center min-h-[96px] sm:min-h-[112px] h-auto py-3 sm:py-4 group">
                <h3 className="font-semibold text-sm text-slate-850 dark:text-[#F5F5F5] mb-1 sm:mb-1.5 group-hover:text-[#D4AF6A] transition-colors">Voice assistant</h3>
                <p className="text-xs text-slate-500 dark:text-[#CFCFCF] leading-relaxed font-normal">Enable voice input for hands-free speech command execution</p>
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
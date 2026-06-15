import { motion } from 'framer-motion';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User } from 'lucide-react';

interface ChatBubbleProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// Minimal brand symbol for the assistant avatar
const AssistantAvatar = () => (
  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-primary to-brand-secondary text-white font-bold text-sm flex items-center justify-center shadow-sm select-none">
    J
  </div>
);

export const ChatBubble: React.FC<ChatBubbleProps> = ({ id, role, content, isStreaming }) => {
  const isUser = role === 'user';

  return (
    <motion.div
      layout
      layoutId={`message-${id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ 
        type: 'spring', 
        stiffness: 350, 
        damping: 30 
      }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}
    >
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 items-start`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-xs">
              <User className="w-4.5 h-4.5" />
            </div>
          ) : (
            <AssistantAvatar />
          )}
        </div>

        {/* Bubble */}
        <div
          className={`
            px-5 py-3.5 relative text-sm leading-relaxed shadow-xs transition-colors duration-200
            ${isUser 
              ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-2xl rounded-tr-xs' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-2xl rounded-tl-xs'
            }
          `}
        >
          <div className="relative z-10 prose dark:prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-pre:my-2 prose-pre:bg-slate-50 dark:prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700/60 prose-pre:shadow-sm prose-code:text-brand-primary dark:prose-code:text-brand-secondary prose-code:font-mono font-sans tracking-normal">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex flex-col gap-1 py-0.5 px-0.5">
                <span className="text-xs text-slate-400 dark:text-slate-500 mb-1.5 select-none font-medium animate-pulse">
                  Thinking...
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            ) : null}
            
            {/* Blinking cursor at the end while streaming */}
            {isStreaming && content && (
               <span className="inline-block w-1.5 h-3.5 bg-brand-primary dark:bg-brand-secondary ml-1 animate-pulse align-middle"></span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

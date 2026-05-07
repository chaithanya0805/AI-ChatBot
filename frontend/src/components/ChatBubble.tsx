import { motion } from 'framer-motion';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';

interface ChatBubbleProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ id, role, content, isStreaming }) => {
  const isUser = role === 'user';

  return (
    <motion.div
      layout
      layoutId={`message-${id}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}
    >
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 mt-1 flex items-center justify-center w-8 h-8 rounded-full ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-500 to-blue-500'} shadow-lg`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* Bubble */}
        <div
          className={`
            px-5 py-3.5 rounded-2xl relative overflow-hidden text-[15px]
            ${isUser 
              ? 'bg-blue-600 text-white rounded-tr-sm shadow-[0_0_25px_rgba(37,99,235,0.15)]' 
              : 'bg-white/5 text-gray-100 rounded-tl-sm backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
            }
          `}
        >
          {/* Shimmer effect for streaming assistant messages */}
          {isStreaming && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] animate-shimmer pointer-events-none" />
          )}
          
          <div className="relative z-10 prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-w-none">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : isStreaming ? (
              <span className="opacity-0">Typing...</span> // Preserve height
            ) : null}
          </div>

          {/* Typing indicator pulse (only if streaming and empty) */}
          {isStreaming && content === '' && (
            <div className="absolute inset-0 flex items-center pl-5">
              <div className="flex gap-1.5 items-center">
                <motion.div className="w-1.5 h-1.5 bg-blue-400 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} />
                <motion.div className="w-1.5 h-1.5 bg-blue-400 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} />
                <motion.div className="w-1.5 h-1.5 bg-blue-400 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

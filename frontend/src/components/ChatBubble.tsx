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

export const ChatBubble: React.FC<ChatBubbleProps> = ({ id, role, content, isStreaming }) => {
  const isUser = role === 'user';

  return (
    <motion.div
      layout
      layoutId={`message-${id}`}
      initial={{ opacity: 0, x: isUser ? 50 : -50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25 
      }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8 group`}
    >
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 mt-1 flex items-center justify-center w-10 h-10 border border-jarvis-cyan/30 bg-black/50 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative ${isUser ? 'rounded-br-2xl' : 'rounded-bl-2xl'}`}>
          {isUser ? (
            <User className="w-5 h-5 text-jarvis-cyan" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute w-4 h-4 bg-jarvis-cyan/50 blur-[2px] rounded-full animate-pulse-glow"></div>
              <div className="w-2 h-2 bg-white rounded-full relative z-10"></div>
            </div>
          )}
          {/* HUD decorative corner */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-jarvis-cyan/50"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-jarvis-cyan/50"></div>
        </div>

        {/* Bubble */}
        <div
          className={`
            px-6 py-4 relative overflow-hidden text-[15px] min-w-[200px]
            ${isUser 
              ? 'bg-jarvis-cyan/10 text-white border-r-2 border-jarvis-cyan shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-tl-xl rounded-bl-xl' 
              : 'bg-black/60 text-jarvis-cyan border-l-2 border-jarvis-cyan/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-tr-xl rounded-br-xl'
            }
          `}
        >
          {/* HUD decorative elements */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-jarvis-cyan/40 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-jarvis-cyan/40 to-transparent"></div>
          
          {!isUser && (
            <div className="absolute top-2 right-2 text-[8px] font-mono opacity-30 tracking-widest uppercase">
              RECV_ID:{id.substring(0, 8)}
            </div>
          )}

          {/* Shimmer effect for streaming assistant messages */}
          {isStreaming && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-jarvis-cyan/10 to-transparent w-[200%] animate-shimmer pointer-events-none" />
          )}
          
          <div className="relative z-10 prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/80 prose-pre:border prose-pre:border-jarvis-cyan/20 prose-pre:shadow-[inset_0_0_10px_rgba(0,240,255,0.1)] prose-code:text-jarvis-cyan max-w-none font-mono tracking-wide">
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-jarvis-cyan/50">
                <span>PROCESSING DIRECTIVE</span>
                <span className="w-2 h-4 bg-jarvis-cyan animate-pulse"></span>
              </div>
            ) : null}
            
            {/* Blinking cursor at the end while streaming */}
            {isStreaming && content && (
               <span className="inline-block w-2 h-4 bg-jarvis-cyan ml-1 animate-pulse align-middle"></span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

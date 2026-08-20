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
  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-extrabold text-sm flex items-center justify-center shadow-sm select-none">
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
      className={`flex w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6 group`}
    >
      <div className={`flex min-w-0 ${isUser ? 'max-w-[min(85%,100%)] xs:max-w-[80%] sm:max-w-[75%]' : 'max-w-[min(92%,100%)] sm:max-w-[85%] md:max-w-[75ch]'} w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2 sm:gap-3 items-start`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#1E1E1E] border border-slate-350 dark:border-[#2A2A2A] text-slate-500 dark:text-[#F5F5F5] flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <AssistantAvatar />
          )}
        </div>

        {/* Bubble */}
        <div
          className={`
            px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 relative text-sm leading-relaxed shadow-xs transition-colors duration-250 w-full min-w-0 max-w-full overflow-hidden break-words overflow-wrap-anywhere
            ${isUser 
              ? 'bg-slate-100 dark:bg-[#181818] text-slate-800 dark:text-[#F5F5F5] border border-slate-200/60 dark:border-[#2A2A2A] rounded-2xl rounded-tr-xs font-medium' 
              : 'bg-white dark:bg-[#0F0F0F] text-slate-800 dark:text-[#F5F5F5] border border-slate-200/60 dark:border-[#2A2A2A] rounded-2xl rounded-tl-xs'
            }
          `}
        >
          <div className="relative z-10 prose dark:prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-pre:my-2.5 prose-pre:bg-slate-50 dark:prose-pre:bg-[#151515] prose-pre:border prose-pre:border-slate-200/80 dark:prose-pre:border-[#2A2A2A] prose-pre:shadow-xs prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:max-w-full prose-code:text-[#D4AF6A] dark:prose-code:text-[#D4AF6A] prose-code:font-mono prose-code:break-words prose-img:max-w-full prose-img:h-auto font-sans tracking-normal overflow-wrap-anywhere">
            {content ? (
              <ReactMarkdown
                components={{
                  pre: ({node, ...props}) => (
                    <pre className="overflow-x-auto max-w-full whitespace-pre-wrap break-words" {...props} />
                  ),
                  code: ({node, className, children, ...props}) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return <code className={`${className || ''} break-words whitespace-pre-wrap`} {...props}>{children}</code>;
                    }
                    return <code className="break-words" {...props}>{children}</code>;
                  },
                  a: ({node, ...props}) => (
                    <a className="break-all" {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto w-full max-w-full my-4 border border-slate-200/50 dark:border-slate-800 rounded-xl scrollbar-thin">
                      <table className="min-w-full text-xs border-collapse" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-left font-bold" {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className="px-4 py-2 border-b border-slate-100/50 dark:border-slate-900/30 text-left" {...props} />
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex flex-col gap-1 py-0.5 px-0.5">
                <span className="text-xs text-slate-450 dark:text-[#9A9A9A] mb-1.5 select-none font-medium animate-pulse">
                  Thinking...
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-[#D4AF6A] animate-typing" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-[#D4AF6A] animate-typing" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-[#D4AF6A] animate-typing" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            ) : null}
            
            {/* Blinking cursor at the end while streaming */}
            {isStreaming && content && (
               <span className="inline-block w-1.5 h-3.5 bg-brand-primary dark:bg-[#D4AF6A] ml-1 animate-pulse align-middle"></span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

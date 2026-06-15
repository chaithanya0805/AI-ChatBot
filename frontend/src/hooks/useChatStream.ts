import { useState, useCallback } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export const useChatStream = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (prompt: string) => {

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt
    };

    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);

    try {

      const response = await fetch('http://localhost:8083/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.text();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data
      };

      setMessages((prev) => [...prev, assistantMsg]);

    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }

  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    isTyping
  };
};
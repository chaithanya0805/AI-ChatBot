import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

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

    let content = "";

    try {

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt }),
      });

      const data = await response.text();

      if (!response.ok) {
        console.error("AI service error response:", response.status, data);
        if (response.status === 429) {
          content = "⚠️ The AI service is currently busy. Please try again after some time.";
        } else {
          content = "⚠️ Jarvis is temporarily unavailable. Please try again in a few moments.";
        }
      } else {
        content = data;
      }

    } catch (error) {
      console.error("Chat request exception:", error);
      content = "⚠️ Jarvis is temporarily unavailable. Please try again in a few moments.";
    } finally {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content
      };

      setMessages((prev) => [...prev, assistantMsg]);
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
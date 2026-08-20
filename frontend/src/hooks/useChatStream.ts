import { useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export const useChatStream = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(async (prompt: string) => {
    // Abort previous streaming request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let content = "";
    let streamStarted = false;
    const assistantMsgId = crypto.randomUUID();

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
        signal: abortController.signal
      });

      if (!response.ok) {
        const data = await response.text();
        console.error("AI service error response:", response.status, data);
        if (response.status === 503) {
          content = "Jarvis is currently unavailable. Please try again later.";
        } else if (response.status === 429) {
          content = "⚠️ The AI service is currently busy. Please try again after some time.";
        } else {
          content = "⚠️ Jarvis is temporarily unavailable. Please try again in a few moments.";
        }
      } else {
        streamStarted = true;
        // Append an empty assistant message slot to update progressively
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: ""
          }
        ]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              content += chunk;

              setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex((m) => m.id === assistantMsgId);
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    content: content
                  };
                }
                return updated;
              });
            }
          } finally {
            reader.releaseLock();
          }
        }
      }
    } catch (error: any) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Chat request aborted");
        return; // exit early without resetting state or adding error message
      }
      console.error("Chat request exception:", error);
      content = "⚠️ Jarvis is temporarily unavailable. Please try again in a few moments.";
    } finally {
      if (abortController.signal.aborted) {
        // Do not update states if this request was aborted
        return;
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      
      // If stream didn't start or we encountered an error, append the assistant message slot with the error content
      if (!streamStarted) {
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
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
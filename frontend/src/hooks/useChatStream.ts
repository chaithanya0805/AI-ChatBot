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
  const messagesRef = useRef<Message[]>([]);

  // Keep messagesRef in sync with messages state immediately
  const updateMessagesState = useCallback((newMsgs: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const resolved = typeof newMsgs === 'function' ? newMsgs(prev) : newMsgs;
      messagesRef.current = resolved;
      return resolved;
    });
  }, []);

  // Clean up any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopStreaming = useCallback((): Message[] => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    return messagesRef.current;
  }, []);

  const sendMessage = useCallback(async (prompt: string): Promise<{ finalMessages: Message[]; completed: boolean } | null> => {
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

    updateMessagesState((prev) => [...prev, userMsg]);
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
        updateMessagesState((prev) => [
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

              updateMessagesState((prev) => {
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
      
      setIsTyping(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      return { finalMessages: messagesRef.current, completed: true };

    } catch (error: any) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log("Chat request aborted");
        return null; // exit early without updating states
      }
      console.error("Chat request exception:", error);
      content = "⚠️ Jarvis is temporarily unavailable. Please try again in a few moments.";
      
      // If stream didn't start or we encountered an error, append the assistant message slot with the error content
      if (!streamStarted) {
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content
        };
        updateMessagesState((prev) => [...prev, assistantMsg]);
      } else {
        updateMessagesState((prev) => {
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

      setIsTyping(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      return { finalMessages: messagesRef.current, completed: false };
    }
  }, [updateMessagesState]);

  return {
    messages,
    setMessages,
    sendMessage,
    isTyping,
    stopStreaming
  };
};
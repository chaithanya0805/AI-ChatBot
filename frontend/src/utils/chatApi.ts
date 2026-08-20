import { Message } from '../hooks/useChatStream';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

/** Raw session payload from the backend API (timestamp may be a formatted string). */
export type BackendChatSession = Omit<ChatSession, 'timestamp'> & {
  timestamp?: number | string;
};

/** Backend persists session IDs as S1, S2, … */
export function isBackendSessionId(id: string | null | undefined): boolean {
  return typeof id === 'string' && /^S\d+$/.test(id);
}

/** Compare message content only — ignore client/server id differences. */
export function messagesContentEqual(a: Message[], b: Message[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((msg, i) => msg.role === b[i].role && msg.content === b[i].content);
}

export function serializeMessagesForCompare(msgs: Message[]): string {
  return JSON.stringify(msgs.map(m => ({ role: m.role, content: m.content })));
}

/** Map HTTP status + body to a user-facing chat-history error message. */
export async function getChatApiErrorMessage(
  res: Response,
  context: 'load' | 'save' | 'delete' | 'clear'
): Promise<string> {
  let body = '';
  try {
    body = await res.text();
  } catch {
    body = '';
  }

  const trimmed = body.trim();
  const fromBody = trimmed.length > 0 && !trimmed.startsWith('{') ? trimmed : null;

  switch (res.status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to access this chat session.';
    case 404:
      return fromBody ?? 'Chat session not found.';
    case 400:
      return fromBody ?? 'Invalid chat request.';
    case 503:
      if (fromBody) return fromBody;
      if (context === 'load') return 'Database is currently unavailable. Chat history could not be loaded.';
      if (context === 'save') return 'Database is currently unavailable. Chat session could not be saved.';
      if (context === 'delete') return 'Database is currently unavailable. Chat session could not be deleted.';
      return 'Database is currently unavailable. Chat history could not be cleared.';
    case 500:
    default:
      if (fromBody) return fromBody;
      return 'An unexpected server error occurred. Please try again.';
  }
}

/** Normalize backend chat payload (timestamp may be string or number). */
export function normalizeChatSession(raw: BackendChatSession): ChatSession {
  const ts = raw.timestamp;
  let timestamp = Date.now();
  if (typeof ts === 'number') {
    timestamp = ts;
  } else if (typeof ts === 'string') {
    timestamp = Date.parse(ts.replace(' ', 'T')) || Date.now();
  }

  return {
    ...raw,
    id: raw.id,
    timestamp,
    messages: (raw.messages ?? []).map(m => ({
      id: String(m.id ?? crypto.randomUUID()),
      role: m.role,
      content: m.content,
    })),
  };
}

export function normalizeChatSessions(raw: BackendChatSession[]): ChatSession[] {
  return raw.map(normalizeChatSession);
}

import type { ChatConversation } from '../api/chat-api';

const CACHE_VERSION = 1;
const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 120;

export type CachedChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyTo?: { id: string; senderName: string; content: string } | null;
  reactions?: Array<{ emoji: string; userIds: string[] }>;
  attachments?: Array<{ url: string; name: string; mimeType: string; size: number; type: 'image' | 'audio' | 'video' | 'document' }>;
  poll?: {
    question: string;
    options: Array<{ id: string; text: string; voterIds: string[] }>;
    allowMultiple: boolean;
    closedAt?: string | null;
  } | null;
  pending?: boolean;
};

type ChatCachePayload = {
  version: number;
  conversations: ChatConversation[];
  messagesByConversation: Record<string, CachedChatMessage[]>;
};

function cacheKey(userId?: string | null) {
  return `chatin_chat_cache_v${CACHE_VERSION}_${userId ?? 'anonymous'}`;
}

function readPayload(userId?: string | null): ChatCachePayload {
  if (typeof window === 'undefined') return { version: CACHE_VERSION, conversations: [], messagesByConversation: {} };
  try {
    const raw = window.sessionStorage.getItem(cacheKey(userId));
    if (!raw) return { version: CACHE_VERSION, conversations: [], messagesByConversation: {} };
    const parsed = JSON.parse(raw) as ChatCachePayload;
    if (parsed.version !== CACHE_VERSION) return { version: CACHE_VERSION, conversations: [], messagesByConversation: {} };
    return {
      version: CACHE_VERSION,
      conversations: parsed.conversations ?? [],
      messagesByConversation: parsed.messagesByConversation ?? {},
    };
  } catch {
    return { version: CACHE_VERSION, conversations: [], messagesByConversation: {} };
  }
}

function writePayload(userId: string | undefined | null, payload: ChatCachePayload) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    // Storage can be full or disabled. Cache failures should never break chat.
  }
}

export const chatCache = {
  readConversations(userId?: string | null) {
    return readPayload(userId).conversations;
  },

  writeConversations(userId: string | undefined | null, conversations: ChatConversation[]) {
    const payload = readPayload(userId);
    payload.conversations = conversations.slice(0, MAX_CONVERSATIONS);
    writePayload(userId, payload);
  },

  readMessages(userId: string | undefined | null, conversationId: string) {
    return readPayload(userId).messagesByConversation[conversationId] ?? [];
  },

  writeMessages(userId: string | undefined | null, conversationId: string, messages: CachedChatMessage[]) {
    const payload = readPayload(userId);
    payload.messagesByConversation[conversationId] = messages
      .filter((message) => !message.pending)
      .slice(-MAX_MESSAGES_PER_CONVERSATION);
    writePayload(userId, payload);
  },

  clear(userId?: string | null) {
    if (typeof window === 'undefined') return;
    try {
      if (userId) {
        window.sessionStorage.removeItem(cacheKey(userId));
        return;
      }
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith(`chatin_chat_cache_v${CACHE_VERSION}_`))
        .forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
      // Ignore storage failures.
    }
  },
};

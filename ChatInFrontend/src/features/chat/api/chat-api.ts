import { authApi, clearAuthSession, saveAuthSession } from '../../auth/api/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';

export type ChatConversation = {
  id: string;
  title: string;
  type: 'group' | 'direct';
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  pinnedAt: string | null;
  mutedUntil: string | null;
  lastReadAt: string | null;
  members: Array<{ userId: string; displayName: string; role: 'admin' | 'member'; lastReadAt: string | null }>;
};

export type UploadedChatFile = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'image' | 'audio' | 'video' | 'document';
};

let pendingRefresh: Promise<void> | null = null;

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401 && !isRetry) {
    if (!pendingRefresh) {
      pendingRefresh = authApi
        .refresh()
        .then(saveAuthSession)
        .catch(() => { clearAuthSession(); throw new Error('Sessão inválida. Entre novamente.'); })
        .finally(() => { pendingRefresh = null; });
    }
    await pendingRefresh;
    return request<T>(path, options, true);
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.');
  return json;
}

async function uploadRequest<T>(path: string, file: File, isRetry = false): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body,
  });

  if (response.status === 401 && !isRetry) {
    if (!pendingRefresh) {
      pendingRefresh = authApi
        .refresh()
        .then(saveAuthSession)
        .catch(() => { clearAuthSession(); throw new Error('Sessão inválida. Entre novamente.'); })
        .finally(() => { pendingRefresh = null; });
    }
    await pendingRefresh;
    return uploadRequest<T>(path, file, true);
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.');
  return json;
}

export const chatApi = {
  listConversations: () => request<ChatConversation[]>('/conversations'),
  createGroup: (title: string) => request<ChatConversation>('/conversations/groups', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  openDirect: (targetUserId: string) => request<ChatConversation>('/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  }),
  addContactByEmail: (email: string) => request<ChatConversation>('/conversations/contacts', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  pinConversation: (id: string) => request<{ pinnedAt: string | null }>(`/conversations/${id}/pin`, { method: 'PATCH' }),
  muteConversation: (id: string) => request<{ mutedUntil: string | null }>(`/conversations/${id}/mute`, { method: 'PATCH' }),
  markAsRead: (id: string) => request<{ lastReadAt: string }>(`/conversations/${id}/read`, { method: 'PATCH' }),
  deleteConversation: (id: string, deleteForAll: boolean) => request<{ success: boolean }>(`/conversations/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ deleteForAll }),
  }),
  uploadFile: (file: File) => uploadRequest<UploadedChatFile>('/uploads/file', file),
};

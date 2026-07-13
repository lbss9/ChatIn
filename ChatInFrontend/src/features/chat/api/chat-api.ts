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

let pendingRefresh: Promise<void> | null = null;

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = sessionStorage.getItem('chatin_access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && !isRetry) {
    if (!pendingRefresh) {
      const rt = sessionStorage.getItem('chatin_refresh_token');
      if (!rt) {
        clearAuthSession();
        throw new Error('Sessão inválida. Entre novamente.');
      }
      pendingRefresh = authApi
        .refresh(rt)
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
};

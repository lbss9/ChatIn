import { chatCache } from '../../chat/cache/chat-cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';
export type AuthUserBadge = { code: string; awardedAt: string };

export type AuthResult = {
  user: { id: string; name: string; nickname?: string; email: string; bio?: string; coverUrl?: string; coverPosition?: string; badges: Array<string | AuthUserBadge> };
};
async function request<T>(path: string, body: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.');
  return json;
}
export const authApi = {
  login: (email: string, password: string) => request<AuthResult>('/auth/login', { email, password }),
  register: (name: string, nickname: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { name, nickname, email, password }),
  recoverPassword: (email: string) => request<void>('/auth/recover-password', { email }),
  resetPassword: (token: string, password: string) => request<void>('/auth/reset-password', { token, password }),
  refresh: () => request<AuthResult>('/auth/refresh'),
};

export function saveAuthSession(session: AuthResult) {
  sessionStorage.setItem('chatin_user', JSON.stringify(session.user));
}

export function clearAuthSession() {
  let userId: string | null = null;
  try {
    const storedUser = sessionStorage.getItem('chatin_user');
    userId = storedUser ? ((JSON.parse(storedUser) as { id?: string }).id ?? null) : null;
  } catch {
    userId = null;
  }
  chatCache.clear(userId);
  sessionStorage.removeItem('chatin_access_token');
  sessionStorage.removeItem('chatin_refresh_token');
  sessionStorage.removeItem('chatin_user');
}

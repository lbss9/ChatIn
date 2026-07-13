const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';
export type AuthUserBadge = { code: string; awardedAt: string };

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; nickname?: string; email: string; bio?: string; coverUrl?: string; coverPosition?: string; badges: Array<string | AuthUserBadge> };
};
async function request<T>(path: string, body: Record<string, string>): Promise<T> { const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.'); return json; }
export const authApi = {
  login: (email: string, password: string) => request<AuthResult>('/auth/login', { email, password }),
  register: (name: string, nickname: string, email: string, password: string) =>
    request<AuthResult>('/auth/register', { name, nickname, email, password }),
  recoverPassword: (email: string) => request<void>('/auth/recover-password', { email }),
  resetPassword: (token: string, password: string) => request<void>('/auth/reset-password', { token, password }),
  refresh: (refreshToken: string) => request<AuthResult>('/auth/refresh', { refreshToken }),
};

export function saveAuthSession(session: AuthResult) {
  localStorage.setItem('chatin_access_token', session.accessToken);
  localStorage.setItem('chatin_refresh_token', session.refreshToken);
  localStorage.setItem('chatin_user', JSON.stringify(session.user));
}

export function clearAuthSession() {
  localStorage.removeItem('chatin_access_token');
  localStorage.removeItem('chatin_refresh_token');
  localStorage.removeItem('chatin_user');
}

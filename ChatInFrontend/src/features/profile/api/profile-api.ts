import { authApi, clearAuthSession, saveAuthSession } from '../../auth/api/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';

export type UserBadge = { code: string; awardedAt: string };

export type UserProfile = {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  bio?: string;
  coverUrl?: string;
  coverPosition?: string;
  badges: Array<string | UserBadge>;
};

let pendingRefresh: Promise<void> | null = null;

async function authorizedRequest<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers });

  if (response.status === 401 && !isRetry) {
    if (!pendingRefresh) {
      pendingRefresh = authApi
        .refresh()
        .then(saveAuthSession)
        .catch(() => {
          clearAuthSession();
          throw new Error('Sessão inválida. Entre novamente.');
        })
        .finally(() => {
          pendingRefresh = null;
        });
    }
    await pendingRefresh;
    return authorizedRequest<T>(path, options, true);
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.');
  return json;
}

function saveProfile(profile: UserProfile) {
  sessionStorage.setItem('chatin_user', JSON.stringify(profile));
  return profile;
}

export const profileApi = {
  me: () => authorizedRequest<UserProfile>('/auth/me').then(saveProfile),
  updateProfile: (payload: { name: string; nickname: string; bio?: string; coverUrl?: string; coverPosition?: string }) =>
    authorizedRequest<UserProfile>('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }).then(saveProfile),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    authorizedRequest<{ success: boolean }>('/auth/password', { method: 'PATCH', body: JSON.stringify(payload) }),
  changeEmail: (payload: { email: string; currentPassword: string }) =>
    authorizedRequest<UserProfile>('/auth/email', { method: 'PATCH', body: JSON.stringify(payload) }).then(saveProfile),
  logout: () => authorizedRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  deleteAccount: (payload: { currentPassword: string; confirmation: string }) =>
    authorizedRequest<{ success: boolean }>('/auth/account', { method: 'DELETE', body: JSON.stringify(payload) }),
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authorizedRequest<{ url: string }>('/uploads/image', { method: 'POST', body: formData });
  },
};

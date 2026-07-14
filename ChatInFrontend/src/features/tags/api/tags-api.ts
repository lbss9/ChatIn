import { authApi, clearAuthSession, saveAuthSession } from '../../auth/api/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3003';

export type Tag = {
  id: string;
  userId: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  conversationIds: string[];
  order: number;
};

export type CreateTagInput = {
  name: string;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  conversationIds?: string[];
};

export type UpdateTagInput = Partial<CreateTagInput> & { order?: number };

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
      pendingRefresh = authApi.refresh().then(saveAuthSession)
        .catch(() => { clearAuthSession(); throw new Error('Sessão inválida. Entre novamente.'); })
        .finally(() => { pendingRefresh = null; });
    }
    await pendingRefresh;
    return request<T>(path, options, true);
  }

  if (response.status === 204) return undefined as unknown as T;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? 'Erro inesperado.');
  return json;
}

async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/uploads/image`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? 'Falha no upload da imagem.');
  return json;
}

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${UPLOADS_URL}${imageUrl}`;
}

export const tagsApi = {
  list: () => request<Tag[]>('/tags'),
  create: (data: CreateTagInput) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateTagInput) => request<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/tags/${id}`, { method: 'DELETE' }),
  uploadImage,
};

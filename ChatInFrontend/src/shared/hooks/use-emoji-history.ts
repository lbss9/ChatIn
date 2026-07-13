import { useCallback } from 'react';

const DEFAULTS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];
const MAX_STORED = 30;

function storageKey(userId: string) {
  return `chatin_emoji_history_${userId}`;
}

export function useEmojiHistory(userId: string | undefined) {
  const record = useCallback((emoji: string) => {
    if (!userId) return;
    const raw = localStorage.getItem(storageKey(userId));
    const history: string[] = raw ? JSON.parse(raw) : [];
    const updated = [emoji, ...history.filter(e => e !== emoji)].slice(0, MAX_STORED);
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
  }, [userId]);

  const getTop = useCallback((n: number): string[] => {
    if (!userId) return DEFAULTS.slice(0, n);
    const raw = localStorage.getItem(storageKey(userId));
    const history: string[] = raw ? JSON.parse(raw) : [];
    const result = [...history.slice(0, n)];
    for (const d of DEFAULTS) {
      if (result.length >= n) break;
      if (!result.includes(d)) result.push(d);
    }
    return result.slice(0, n);
  }, [userId]);

  return { record, getTop };
}

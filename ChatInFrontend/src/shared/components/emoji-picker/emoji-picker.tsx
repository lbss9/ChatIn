'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { EMOJI_BY_VALUE, EMOJI_CATALOG, EMOJI_CATEGORIES, type EmojiCategoryId, type EmojiEntry } from './emoji-catalog';

const MAX_RECENTS = 24;
const MAX_SEARCH_RESULTS = 160;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function readRecents(storageKey: string): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((emoji): emoji is string => typeof emoji === 'string' && EMOJI_BY_VALUE.has(emoji)).slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  height?: number;
  className?: string;
  searchPlaceholder?: string;
  storageKey?: string;
  ariaLabel?: string;
};

const MemoizedEmojiPicker = memo(function MemoizedEmojiPicker({
  onSelect,
  height = 360,
  className = '',
  searchPlaceholder = 'Buscar emoji...',
  storageKey = 'chatin_emoji_picker_recents',
  ariaLabel = 'Seletor de emoji',
}: EmojiPickerProps) {
  const [category, setCategory] = useState<EmojiCategoryId>('recent');
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const searchId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => setRecents(readRecents(storageKey)), [storageKey]);

  const entries = useMemo(() => {
    const search = normalize(deferredQuery);
    if (search) {
      return EMOJI_CATALOG.filter(entry => normalize(`${entry.emoji} ${entry.label} ${entry.keywords.join(' ')}`).includes(search)).slice(0, MAX_SEARCH_RESULTS);
    }
    if (category === 'recent') {
      return recents.map(emoji => EMOJI_BY_VALUE.get(emoji)).filter((entry): entry is EmojiEntry => Boolean(entry));
    }
    return EMOJI_CATALOG.filter(entry => entry.category === category);
  }, [category, deferredQuery, recents]);

  const selectEmoji = useCallback((emoji: string) => {
    const nextRecents = [emoji, ...recents.filter(item => item !== emoji)].slice(0, MAX_RECENTS);
    setRecents(nextRecents);
    try { window.localStorage.setItem(storageKey, JSON.stringify(nextRecents)); } catch { /* Local storage may be unavailable. */ }
    onSelect(emoji);
  }, [onSelect, recents, storageKey]);

  const selectCategory = useCallback((id: EmojiCategoryId) => {
    setQuery('');
    setCategory(id);
    gridRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <section className={`chatin-emoji-picker ${className}`} style={{ '--emoji-picker-height': `${height}px` } as React.CSSProperties} aria-label={ariaLabel}>
      <label className="chatin-emoji-search" htmlFor={searchId}>
        <MagnifyingGlassIcon aria-hidden="true" />
        <input id={searchId} value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} autoComplete="off" />
      </label>

      <div className="chatin-emoji-categories" role="tablist" aria-label="Categorias de emoji">
        {EMOJI_CATEGORIES.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={!query && category === item.id}
            className={!query && category === item.id ? 'active' : ''}
            onClick={() => selectCategory(item.id)}
            title={item.label}
          >
            <span aria-hidden="true">{item.icon}</span>
          </button>
        ))}
      </div>

      <div className="chatin-emoji-grid-wrap" ref={gridRef}>
        <p className="chatin-emoji-grid-label">{query ? `Resultados para “${query}”` : EMOJI_CATEGORIES.find(item => item.id === category)?.label}</p>
        {entries.length > 0 ? (
          <div className="chatin-emoji-grid" role="grid" aria-label="Emojis disponíveis">
            {entries.map(entry => (
              <button key={entry.emoji} type="button" role="gridcell" className="chatin-emoji-button" onClick={() => selectEmoji(entry.emoji)} title={entry.label} aria-label={entry.label}>
                {entry.emoji}
              </button>
            ))}
          </div>
        ) : (
          <p className="chatin-emoji-empty">{query ? 'Nenhum emoji encontrado.' : 'Seus emojis recentes vão aparecer aqui.'}</p>
        )}
      </div>
    </section>
  );
});

export default function EmojiPicker(props: EmojiPickerProps) {
  return <MemoizedEmojiPicker {...props} />;
}

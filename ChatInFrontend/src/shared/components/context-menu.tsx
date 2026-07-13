'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
const EmojiPicker = dynamic(() => import('./emoji-picker/emoji-picker'), { ssr: false });

export type ContextMenuItem =
  | { type: 'separator' }
  | { type: 'emoji-row'; emojis: string[]; onSelect: (emoji: string) => void }
  | { type: 'item'; label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean };

type MenuState = { x: number; y: number; items: ContextMenuItem[] } | null;

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState>(null);

  const open = useCallback((items: ContextMenuItem[], event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return { menu, open, close };
}

type ContextMenuProps = {
  menu: MenuState;
  onClose: () => void;
};

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const emojiRowRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!menu) { setPickerOpen(false); return; }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (pickerOpen) setPickerOpen(false); else onClose(); } };
    const handleDismiss = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && (ref.current?.contains(target) || pickerRef.current?.contains(target))) return;
      onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handleDismiss);
    document.addEventListener('contextmenu', handleDismiss);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handleDismiss);
      document.removeEventListener('contextmenu', handleDismiss);
    };
  }, [menu, onClose, pickerOpen]);

  if (!menu) return null;

  const itemCount = menu.items.filter(i => i.type === 'item').length;
  const hasEmojiRow = menu.items.some(i => i.type === 'emoji-row');
  const estimatedHeight = itemCount * 40 + (hasEmojiRow ? 56 : 0) + 24;
  const menuWidth = hasEmojiRow ? 290 : 224;
  const x = Math.min(menu.x, window.innerWidth - menuWidth);
  const y = Math.min(menu.y, window.innerHeight - estimatedHeight - (pickerOpen ? 380 : 0));

  const emojiRowItem = menu.items.find(i => i.type === 'emoji-row') as Extract<ContextMenuItem, { type: 'emoji-row' }> | undefined;

  return (
    <>
      <div
        ref={ref}
        className={`ctx-menu${pickerOpen ? ' picker-open' : ''}`}
        style={{ left: x, top: y }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        {menu.items.map((item, i) => {
          if (item.type === 'separator') return <div key={i} className="ctx-separator" />;
          if (item.type === 'emoji-row') {
            return (
              <div key={i} className="ctx-emoji-row" ref={emojiRowRef}>
                {item.emojis.map(emoji => (
                  <button
                    key={emoji}
                    className="ctx-emoji"
                    onClick={() => { item.onSelect(emoji); onClose(); }}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  className={`ctx-emoji-more${pickerOpen ? ' active' : ''}`}
                  title="Mais emojis"
                  onClick={(e) => { e.stopPropagation(); setPickerOpen(p => !p); }}
                >
                  +
                </button>
              </div>
            );
          }
          return (
            <button
              key={i}
              className={`ctx-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`}
              disabled={item.disabled}
              onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
            >
              {item.icon && <span className="ctx-icon">{item.icon}</span>}
              {item.label}
            </button>
          );
        })}
      </div>

      {pickerOpen && emojiRowItem && (
        <div
          ref={pickerRef}
          className="ctx-picker-wrap"
          style={{ left: Math.max(8, Math.min(x, window.innerWidth - 340)), top: y + estimatedHeight + 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker
            onSelect={(emoji) => {
              emojiRowItem.onSelect(emoji);
              setPickerOpen(false);
              onClose();
            }}
            height={360}
            searchPlaceholder="Buscar emoji..."
            storageKey="chatin_context_emoji_recents"
          />
        </div>
      )}
    </>
  );
}

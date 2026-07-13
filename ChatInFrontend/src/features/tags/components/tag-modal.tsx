'use client';

import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { ChangeEvent, FormEvent, useCallback, useRef, useState } from 'react';
import { type CreateTagInput, type Tag, tagsApi, resolveImageUrl } from '../api/tags-api';

const EmojiPicker = dynamic(() => import('../../../shared/components/emoji-picker/emoji-picker'), { ssr: false });

const TAG_COLORS = ['#eaff8b', '#ff8a7a', '#7addff', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#94a3b8', '#fbbf24'];

type Props = {
  tag: Tag | null;
  onClose: () => void;
  onSave: (tag: Tag) => void;
  onDelete?: (tagId: string) => void;
};

export default function TagModal({ tag, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(tag?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(tag?.emoji ?? null);
  const [color, setColor] = useState<string | null>(tag?.color ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(tag?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = tag !== null;

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são permitidas.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5MB.'); return; }
    setUploading(true);
    setError('');
    try {
      const { url } = await tagsApi.uploadImage(file);
      setImageUrl(url);
      setEmoji(null);
    } catch {
      setError('Falha no upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiSelect = useCallback((selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setImageUrl(null);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreateTagInput = {
        name: name.trim(),
        emoji: emoji || null,
        color: color || null,
        imageUrl: imageUrl || null,
        conversationIds: tag?.conversationIds ?? [],
      };
      const saved = isEdit
        ? await tagsApi.update(tag.id, payload)
        : await tagsApi.create(payload);
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar marcação.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tag || !onDelete) return;
    setSaving(true);
    try {
      await tagsApi.delete(tag.id);
      onDelete(tag.id);
    } catch {
      setError('Erro ao remover marcação.');
      setSaving(false);
    }
  };

  const resolvedImg = resolveImageUrl(imageUrl);

  return (
    <>
      <div className="tag-modal-backdrop" onClick={onClose} />
      <div className="tag-modal" role="dialog" aria-modal="true">
        <div className="tag-modal-header">
          <div>
            <span className="tag-modal-label">{isEdit ? 'Editar marcação' : 'Nova marcação'}</span>
            <strong className="tag-modal-title">{isEdit ? tag.name : 'Criar marcação'}</strong>
          </div>
          <button type="button" className="tag-modal-close" onClick={onClose}><XMarkIcon /></button>
        </div>

        <form onSubmit={handleSubmit} className="tag-modal-form">
          {/* Preview + image upload */}
          <div className="tag-preview-row">
            <button
              type="button"
              className="tag-preview-btn"
              style={{ backgroundColor: color ?? undefined, backgroundImage: resolvedImg ? `url(${resolvedImg})` : undefined }}
              onClick={() => fileRef.current?.click()}
              title="Clique para trocar imagem"
            >
              {!resolvedImg && (emoji ? <span className="tag-preview-emoji">{emoji}</span> : <span className="tag-preview-initials">{name.slice(0, 2).toUpperCase() || '??'}</span>)}
              <span className="tag-preview-overlay"><PhotoIcon /></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
            <div className="tag-preview-info">
              <p>{uploading ? 'Enviando imagem…' : 'Clique no ícone para adicionar uma foto'}</p>
              {resolvedImg && (
                <button type="button" className="tag-remove-img" onClick={() => { setImageUrl(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  Remover foto
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <label className="tag-field">
            <span>Nome da marcação</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Trabalho, Família…" maxLength={40} autoFocus />
          </label>

          {/* Color swatches */}
          <div className="tag-field">
            <span>Cor</span>
            <div className="tag-color-swatches">
              <button type="button" className={`tag-swatch tag-swatch-none${color === null ? ' active' : ''}`} onClick={() => setColor(null)} title="Padrão" />
              {TAG_COLORS.map(c => (
                <button key={c} type="button" className={`tag-swatch${color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} title={c} />
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div className="tag-field">
            <span>Emoji {emoji && <button type="button" className="tag-remove-emoji" onClick={() => setEmoji(null)}>✕ remover</button>}</span>
            <div className="tag-emoji-picker-wrap">
              <EmojiPicker
                onSelect={handleEmojiSelect}
                height={300}
                searchPlaceholder="Buscar emoji..."
                storageKey="chatin_tag_emoji_recents"
              />
            </div>
          </div>

          {error && <p className="tag-error">{error}</p>}

          <div className="tag-modal-actions">
            {isEdit && onDelete && (
              <button type="button" className="tag-btn-danger" onClick={handleDelete} disabled={saving}>Excluir</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="tag-btn-cancel" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="tag-btn-save" disabled={saving || uploading || !name.trim()}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

'use client';

import {
  ArrowUturnLeftIcon,
  BellIcon,
  BellSlashIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilIcon,
  PhoneIcon,
  PhotoIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const EmojiPickerDynamic = dynamic(() => import('../../../shared/components/emoji-picker/emoji-picker'), { ssr: false });
import { authApi, clearAuthSession, saveAuthSession } from '../../auth/api/auth-api';
import { chatApi, type ChatConversation } from '../api/chat-api';
import { ContextMenu, useContextMenu, type ContextMenuItem } from '../../../shared/components/context-menu';
import { tagsApi, resolveImageUrl, type Tag } from '../../tags/api/tags-api';
import TagModal from '../../tags/components/tag-modal';
import { useEmojiHistory } from '../../../shared/hooks/use-emoji-history';
import ProfileModal from '../../profile/components/profile-modal';
import { profileApi, type UserProfile } from '../../profile/api/profile-api';

type StoredUser = UserProfile & { firstName?: string; lastName?: string };
type MessageReplyContext = { id: string; senderName: string; content: string };
type MessageReaction = { emoji: string; userIds: string[] };
type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyTo?: MessageReplyContext | null;
  reactions?: MessageReaction[];
};
type CreateModalMode = 'menu' | 'conversation' | 'contact' | 'group';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3003/chat';
const MAX_SELECTED_TAGS = 3;

function getInitials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'CI';
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function applyReaction(reactions: MessageReaction[], emoji: string, userId: string, action: 'add' | 'remove'): MessageReaction[] {
  const next = reactions.map(r => ({ ...r, userIds: [...r.userIds] }));
  const found = next.find(r => r.emoji === emoji);
  if (action === 'add') {
    if (found && !found.userIds.includes(userId)) found.userIds.push(userId);
    else if (!found) next.push({ emoji, userIds: [userId] });
  } else {
    if (found) found.userIds = found.userIds.filter(id => id !== userId);
  }
  return next.filter(r => r.userIds.length > 0);
}

export default function ChatPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<CreateModalMode>('menu');
  const [contactEmail, setContactEmail] = useState('');
  const [createModalSearch, setCreateModalSearch] = useState('');
  const [status, setStatus] = useState('Conectando...');
  const [error, setError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [clipModalOpen, setClipModalOpen] = useState(false);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
  const [deleteConvTarget, setDeleteConvTarget] = useState<ChatConversation | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu();
  const { record: recordEmoji, getTop: getTopEmojis } = useEmojiHistory(user?.id);

  const isSessionError = error.toLowerCase().includes('sessão inválida') || error.toLowerCase().includes('session');

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const members = activeConversation?.members ?? [];

  const contacts = useMemo(() => {
    const map = new Map<string, { userId: string; displayName: string }>();
    conversations.filter(c => c.type === 'direct').forEach(c => c.members.forEach(m => {
      if (m.userId !== user?.id && !map.has(m.userId)) map.set(m.userId, { userId: m.userId, displayName: m.displayName });
    }));
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [conversations, user?.id]);

  const sortedTags = useMemo(() => {
    const selected = selectedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];
    const unselected = tags.filter(t => !selectedTagIds.includes(t.id));
    return [...selected, ...unselected];
  }, [tags, selectedTagIds]);

  const taggedConvIds = useMemo(() => {
    if (selectedTagIds.length === 0) return null;
    const ids = new Set<string>();
    selectedTagIds.forEach(tagId => {
      tags.find(t => t.id === tagId)?.conversationIds.forEach(cid => ids.add(cid));
    });
    return ids;
  }, [selectedTagIds, tags]);

  const displayedConversations = useMemo(() => {
    if (!taggedConvIds) return conversations;
    const tagged = conversations.filter(c => taggedConvIds.has(c.id));
    const untagged = conversations.filter(c => !taggedConvIds.has(c.id));
    return [...tagged, ...untagged];
  }, [conversations, taggedConvIds]);

  const messagesByDay = useMemo(() => {
    const groups: { label: string; messages: ChatMessage[] }[] = [];
    messages.forEach(msg => {
      const label = formatDayLabel(msg.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.messages.push(msg);
      else groups.push({ label, messages: [msg] });
    });
    return groups;
  }, [messages]);

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0]} está digitando...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`;
    return `${typingUsers.length} pessoas estão digitando...`;
  }, [typingUsers]);

  const loadConversations = async (preferredId?: string) => {
    setLoadingConversations(true);
    const next = await chatApi.listConversations();
    setConversations(next);
    setActiveConversationId(current => {
      if (preferredId && next.some(c => c.id === preferredId)) return preferredId;
      if (current && next.some(c => c.id === current)) return current;
      return next[0]?.id ?? null;
    });
    setLoadingConversations(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('chatin_access_token');
    const storedUser = localStorage.getItem('chatin_user');
    if (!token || !storedUser) { router.replace('/login'); return; }
    setUser(JSON.parse(storedUser) as StoredUser);
    profileApi.me().then((profile) => setUser(profile as StoredUser)).catch(() => {});
    loadConversations().catch(err => setError(err instanceof Error ? err.message : 'Não foi possível carregar as conversas.'));
    tagsApi.list().then(setTags).catch(() => {});

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('Autenticando...'));
    socket.on('chat:connected', () => {
      setStatus('Online');
      setError('');
      if (activeConversationRef.current) socket.emit('chat:join', { conversationId: activeConversationRef.current });
    });
    socket.on('disconnect', () => setStatus('Offline'));

    socket.on('chat:history', (payload: { conversationId: string; messages: ChatMessage[] }) => {
      if (payload.conversationId === activeConversationRef.current) {
        setMessages(payload.messages);
        setLoadingMessages(false);
        isNearBottomRef.current = true;
      }
    });

    socket.on('chat:message', (message: ChatMessage) => {
      setConversations(current => current.map(c => c.id === message.conversationId
        ? { ...c, lastMessagePreview: message.content, lastMessageAt: message.createdAt }
        : c));
      if (message.conversationId === activeConversationRef.current) {
        setMessages(current => current.some(m => m.id === message.id) ? current : [...current, message]);
      } else {
        setUnreadCounts(current => ({ ...current, [message.conversationId]: (current[message.conversationId] ?? 0) + 1 }));
      }
    });

    socket.on('chat:typing', (payload: { conversationId: string; senderName: string }) => {
      if (payload.conversationId !== activeConversationRef.current) return;
      setTypingUsers(current => current.includes(payload.senderName) ? current : [...current, payload.senderName]);
    });
    socket.on('chat:stop-typing', (payload: { conversationId: string; senderName: string }) => {
      if (payload.conversationId !== activeConversationRef.current) return;
      setTypingUsers(current => current.filter(n => n !== payload.senderName));
    });

    socket.on('chat:message-edited', (payload: { messageId: string; content: string; editedAt: string }) => {
      setMessages(current => current.map(m => m.id === payload.messageId ? { ...m, content: payload.content, editedAt: payload.editedAt } : m));
    });
    socket.on('chat:message-deleted', (payload: { messageId: string; deletedAt: string }) => {
      setMessages(current => current.map(m => m.id === payload.messageId ? { ...m, deletedAt: payload.deletedAt } : m));
    });
    socket.on('chat:reaction', (payload: { messageId: string; emoji: string; userId: string; action: 'add' | 'remove' }) => {
      setMessages(current => current.map(m => m.id !== payload.messageId ? m : {
        ...m, reactions: applyReaction(m.reactions ?? [], payload.emoji, payload.userId, payload.action),
      }));
    });

    socket.on('chat:read-receipt', (payload: { conversationId: string; userId: string; readAt: string }) => {
      setConversations(current => current.map(c => {
        if (c.id !== payload.conversationId) return c;
        return {
          ...c,
          members: c.members.map(m => m.userId === payload.userId ? { ...m, lastReadAt: payload.readAt } : m),
          ...(payload.userId === (JSON.parse(localStorage.getItem('chatin_user') ?? '{}') as StoredUser)?.id
            ? { lastReadAt: payload.readAt }
            : {}),
        };
      }));
    });

    socket.on('chat:error', async (payload: { message: string }) => {
      const isSession = ['sessão', 'session', 'unauthorized', 'token'].some(k => payload.message.toLowerCase().includes(k));
      if (isSession) {
        try {
          const rt = localStorage.getItem('chatin_refresh_token');
          if (!rt) throw new Error('no_rt');
          const session = await authApi.refresh(rt);
          saveAuthSession(session);
          socket.auth = { token: session.accessToken };
          socket.connect();
        } catch {
          clearAuthSession();
          router.replace('/login');
        }
      } else {
        setError(payload.message);
      }
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [router]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
    setMessages([]);
    setError('');
    setTypingUsers([]);
    setReplyTo(null);
    setEditingId(null);
    isNearBottomRef.current = true;
    setLoadingMessages(Boolean(activeConversationId));
    if (activeConversationId && socketRef.current?.connected) {
      socketRef.current.emit('chat:join', { conversationId: activeConversationId });
      socketRef.current.emit('chat:read', { conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleFeedScroll = () => {
    const el = chatFeedRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const stopTypingEmit = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (socketRef.current?.connected && activeConversationId) {
      socketRef.current.emit('chat:stop-typing', { conversationId: activeConversationId });
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!socketRef.current?.connected || !activeConversationId) return;
    socketRef.current.emit('chat:typing', { conversationId: activeConversationId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:stop-typing', { conversationId: activeConversationId });
    }, 2000);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !socketRef.current?.connected || !activeConversationId) return;
    socketRef.current.emit('chat:message', { conversationId: activeConversationId, content, replyToId: replyTo?.id ?? null });
    setDraft('');
    setReplyTo(null);
    stopTypingEmit();
  };

  const submitEdit = (event: FormEvent<HTMLFormElement>, messageId: string) => {
    event.preventDefault();
    const content = editDraft.trim();
    if (!content) { setEditingId(null); return; }
    setMessages(current => current.map(m => m.id === messageId ? { ...m, content, editedAt: new Date().toISOString() } : m));
    socketRef.current?.emit('chat:edit-message', { messageId, content });
    setEditingId(null);
  };

  const deleteMessage = (messageId: string) => {
    setMessages(current => current.map(m => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m));
    socketRef.current?.emit('chat:delete-message', { messageId });
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    const alreadyReacted = (msg.reactions ?? []).find(r => r.emoji === emoji)?.userIds.includes(user.id) ?? false;
    const action: 'add' | 'remove' = alreadyReacted ? 'remove' : 'add';
    setMessages(current => current.map(m => m.id !== messageId ? m : {
      ...m, reactions: applyReaction(m.reactions ?? [], emoji, user.id, action),
    }));
    socketRef.current?.emit('chat:react', { messageId, emoji, action });
  };

  const openConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setUnreadCounts(current => ({ ...current, [conversationId]: 0 }));
  };

  const openMessageCtx = (message: ChatMessage, event: React.MouseEvent) => {
    if (message.deletedAt) return;
    const own = message.senderId === user?.id;
    const items: ContextMenuItem[] = [
      { type: 'emoji-row', emojis: getTopEmojis(6), onSelect: (emoji) => { recordEmoji(emoji); reactToMessage(message.id, emoji); } },
      { type: 'separator' },
      { type: 'item', label: 'Responder', icon: <ArrowUturnLeftIcon />, onClick: () => setReplyTo(message) },
      { type: 'item', label: 'Copiar', icon: <ClipboardDocumentIcon />, onClick: () => navigator.clipboard.writeText(message.content) },
      ...(own ? [
        { type: 'separator' as const },
        { type: 'item' as const, label: 'Editar', icon: <PencilIcon />, onClick: () => { setEditingId(message.id); setEditDraft(message.content); } },
        { type: 'item' as const, label: 'Apagar', icon: <TrashIcon />, onClick: () => deleteMessage(message.id), danger: true },
      ] : []),
    ];
    openCtx(items, event);
  };

  const pinConversation = async (conv: ChatConversation) => {
    try {
      const { pinnedAt } = await chatApi.pinConversation(conv.id);
      setConversations(cur => {
        const updated = cur.map(c => c.id === conv.id ? { ...c, pinnedAt } : c);
        return updated.sort((a, b) => {
          if (a.pinnedAt && !b.pinnedAt) return -1;
          if (!a.pinnedAt && b.pinnedAt) return 1;
          return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '');
        });
      });
    } catch { /* ignore */ }
  };

  const muteConversation = async (conv: ChatConversation) => {
    try {
      const { mutedUntil } = await chatApi.muteConversation(conv.id);
      setConversations(cur => cur.map(c => c.id === conv.id ? { ...c, mutedUntil } : c));
    } catch { /* ignore */ }
  };

  const markConversationRead = async (conv: ChatConversation) => {
    try {
      await chatApi.markAsRead(conv.id);
      setUnreadCounts(cur => ({ ...cur, [conv.id]: 0 }));
    } catch { /* ignore */ }
  };

  const confirmDeleteConversation = async (conv: ChatConversation, deleteForAll: boolean) => {
    try {
      await chatApi.deleteConversation(conv.id, deleteForAll);
      setConversations(cur => cur.filter(c => c.id !== conv.id));
      if (activeConversationId === conv.id) {
        const remaining = conversations.filter(c => c.id !== conv.id);
        setActiveConversationId(remaining[0]?.id ?? null);
      }
      setDeleteConvTarget(null);
    } catch { /* ignore */ }
  };

  const openConversationCtx = (conversation: ChatConversation, event: React.MouseEvent) => {
    const isPinned = Boolean(conversation.pinnedAt);
    const isMuted = Boolean(conversation.mutedUntil);
    const items: ContextMenuItem[] = [
      { type: 'item', label: 'Abrir conversa', icon: <PaperAirplaneIcon />, onClick: () => openConversation(conversation.id) },
      { type: 'separator' },
      { type: 'item', label: isPinned ? 'Desafixar conversa' : 'Fixar conversa', icon: <MapPinIcon />, onClick: () => pinConversation(conversation) },
      { type: 'item', label: 'Marcar como lida', icon: <CheckCircleIcon />, onClick: () => markConversationRead(conversation) },
      { type: 'separator' },
      { type: 'item', label: isMuted ? 'Reativar notificações' : 'Silenciar notificações', icon: isMuted ? <BellIcon /> : <BellSlashIcon />, onClick: () => muteConversation(conversation) },
      { type: 'item', label: 'Excluir conversa', icon: <TrashIcon />, onClick: () => setDeleteConvTarget(conversation), danger: true },
    ];
    openCtx(items, event);
  };

  const openPageCtx = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.conversation-card') || target.closest('.ctx-menu') || target.closest('.create-chat-modal') || target.closest('.chat-message') || target.closest('.rail-tag')) return;
    const items: ContextMenuItem[] = [
      { type: 'item', label: 'Nova conversa', icon: <PaperAirplaneIcon />, onClick: () => { setCreateModalOpen(true); setCreateModalMode('conversation'); } },
      { type: 'item', label: 'Criar grupo', icon: <UserGroupIcon />, onClick: () => { setCreateModalOpen(true); setCreateModalMode('group'); } },
      { type: 'separator' },
      { type: 'item', label: 'Preferências', icon: <Cog6ToothIcon />, onClick: () => {}, disabled: true },
    ];
    openCtx(items, event);
  };

  const createGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = groupTitle.trim();
    if (!title) return;
    try {
      const conversation = await chatApi.createGroup(title);
      setGroupTitle('');
      closeCreateModal();
      await loadConversations(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conversa.');
    }
  };

  const openDirectConversation = async (targetUserId: string) => {
    try {
      const conversation = await chatApi.openDirect(targetUserId);
      closeCreateModal();
      await loadConversations(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir a conversa.');
    }
  };

  const addContactByEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = contactEmail.trim().toLowerCase();
    if (!email) return;
    try {
      const conversation = await chatApi.addContactByEmail(email);
      closeCreateModal();
      await loadConversations(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar o contato.');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(cur => {
      if (cur.includes(tagId)) return cur.filter(id => id !== tagId);
      if (cur.length >= MAX_SELECTED_TAGS) return [...cur.slice(1), tagId];
      return [...cur, tagId];
    });
  };

  const openTagModal = (tag: Tag | null = null) => { setEditingTag(tag); setTagModalOpen(true); };
  const openTagCtx = (tag: Tag, event: React.MouseEvent) => {
    openCtx([
      { type: 'item', label: 'Editar marcador', icon: <PencilIcon />, onClick: () => openTagModal(tag) },
    ], event);
  };
  const closeTagModal = () => { setTagModalOpen(false); setEditingTag(null); };

  const handleTagSaved = (saved: Tag) => {
    setTags(cur => {
      const idx = cur.findIndex(t => t.id === saved.id);
      if (idx >= 0) { const next = [...cur]; next[idx] = saved; return next; }
      return [...cur, saved];
    });
    closeTagModal();
  };

  const handleTagDeleted = (tagId: string) => {
    setTags(cur => cur.filter(t => t.id !== tagId));
    setSelectedTagIds(cur => cur.filter(id => id !== tagId));
    closeTagModal();
  };

  const openCreateModal = () => {
    setCreateModalOpen(current => { const next = !current; if (!next) setCreateModalMode('menu'); return next; });
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateModalMode('menu');
    setContactEmail('');
    setCreateModalSearch('');
  };

  const closeComposerPopovers = () => { setClipModalOpen(false); setComposerEmojiOpen(false); setStickerPanelOpen(false); };
  const toggleClip = () => { const next = !clipModalOpen; closeComposerPopovers(); setClipModalOpen(next); };
  const toggleComposerEmoji = () => { const next = !composerEmojiOpen; closeComposerPopovers(); setComposerEmojiOpen(next); };
  const toggleSticker = () => { const next = !stickerPanelOpen; closeComposerPopovers(); setStickerPanelOpen(next); };
  const insertEmoji = (emoji: string) => { setDraft(prev => prev + emoji); setComposerEmojiOpen(false); };

  const logout = () => { socketRef.current?.disconnect(); clearAuthSession(); router.replace('/login'); };
  const redirectToLogin = () => { socketRef.current?.disconnect(); clearAuthSession(); router.replace('/login'); };
  const saveUserProfile = (profile: UserProfile) => setUser(profile as StoredUser);

  return (
    <main className="chat-shell" onContextMenu={openPageCtx}>
      <ContextMenu menu={ctxMenu} onClose={closeCtx} />
      {tagModalOpen && (
        <TagModal
          tag={editingTag}
          onClose={closeTagModal}
          onSave={handleTagSaved}
          onDelete={editingTag ? handleTagDeleted : undefined}
        />
      )}
      {deleteConvTarget && (
        <DeleteConvModal
          conversation={deleteConvTarget}
          onClose={() => setDeleteConvTarget(null)}
          onConfirm={confirmDeleteConversation}
        />
      )}
      {profileModalOpen && user && (
        <ProfileModal
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onSaved={saveUserProfile}
          onLogout={logout}
        />
      )}
      {createModalOpen && <button className="modal-backdrop" type="button" aria-label="Fechar" onClick={closeCreateModal} />}

      <section className="chat-window">
        <aside className="chat-rail">
          <div className="logo-mark">S</div>
          <div className="rail-tags">
            {sortedTags.map(tag => {
              const selected = selectedTagIds.includes(tag.id);
              const imgSrc = resolveImageUrl(tag.imageUrl);
              return (
                <button
                  key={tag.id}
                  className={`rail-tag${imgSrc ? ' has-image' : ''}${selected ? ' selected' : ''}`}
                  style={{
                    '--tag-color': tag.color ?? undefined,
                    '--tag-image': imgSrc ? `url("${imgSrc}")` : undefined,
                  } as React.CSSProperties}
                  onClick={() => toggleTag(tag.id)}
                  onContextMenu={(event) => openTagCtx(tag, event)}
                  title={tag.name}
                  aria-pressed={selected}
                >
                  {imgSrc
                    ? <span className="rail-tag-img" aria-hidden="true" />
                    : tag.emoji
                    ? <span className="rail-tag-emoji">{tag.emoji}</span>
                    : <span className="rail-tag-initials">{tag.name.slice(0, 2).toUpperCase()}</span>}
                  {selected && <span className="rail-tag-dot" />}
                </button>
              );
            })}
          </div>
          <button className="rail-safe"><ShieldCheckIcon /></button>
          <button className="rail-tag-create" onClick={() => openTagModal(null)} title="Nova marcação"><TagIcon /></button>
          <button className="rail-add" onClick={openCreateModal} title="Criar conversa"><PlusIcon /></button>
          {createModalOpen && (
            <CreateChatModal
              contactEmail={contactEmail} contacts={contacts} groupTitle={groupTitle}
              mode={createModalMode} search={createModalSearch}
              onBack={() => setCreateModalMode('menu')} onClose={closeCreateModal}
              onContactEmailChange={setContactEmail} onCreateGroup={createGroup}
              onAddContact={addContactByEmail}
              onGroupTitleChange={setGroupTitle} onOpenDirect={openDirectConversation}
              onSearchChange={setCreateModalSearch} onSelectMode={setCreateModalMode}
            />
          )}
        </aside>

        <aside className="chat-list">
          {loadingConversations && <ConversationListSkeleton />}
          {!loadingConversations && displayedConversations.map((conversation, idx) => {
            const isTagged = taggedConvIds?.has(conversation.id) ?? false;
            const prevIsTagged = idx > 0 ? (taggedConvIds?.has(displayedConversations[idx - 1].id) ?? false) : true;
            const showDivider = taggedConvIds && idx > 0 && !isTagged && prevIsTagged;
            return (
              <div key={conversation.id}>
                {showDivider && <div className="conv-tag-divider"><span>Outros chats</span></div>}
                <button
                  className={`conversation-card ${conversation.id === activeConversationId ? 'active' : ''}${isTagged && taggedConvIds ? ' tagged' : ''}${conversation.pinnedAt ? ' pinned' : ''}${conversation.mutedUntil ? ' muted' : ''}`}
                  onClick={() => openConversation(conversation.id)}
                  onContextMenu={(event) => openConversationCtx(conversation, event)}
                >
                  <span className="conv-avatar">{getInitials(conversation.title)}</span>
                  <strong>{conversation.title}</strong>
                  <small>{conversation.lastMessagePreview ?? `${conversation.members.length} membro${conversation.members.length === 1 ? '' : 's'}`}</small>
                  <div className="conv-meta">
                    {conversation.pinnedAt && <span className="conv-pin-icon"><MapPinIcon /></span>}
                    {conversation.mutedUntil && <span className="conv-mute-icon"><BellSlashIcon /></span>}
                    {(unreadCounts[conversation.id] ?? 0) > 0 && !conversation.mutedUntil && (
                      <span className="unread-badge">{unreadCounts[conversation.id]}</span>
                    )}
                    {(unreadCounts[conversation.id] ?? 0) > 0 && conversation.mutedUntil && (
                      <span className="unread-badge muted-badge">{unreadCounts[conversation.id]}</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </aside>

        <section className="chat-main-panel">
          <header className="chat-topbar">
            {loadingConversations ? (
              <div className="topbar-skeleton"><span className="skeleton-line title" /><span className="skeleton-line subtitle" /></div>
            ) : (
              <div>
                <h1>{activeConversation?.title ?? 'ChatIn'}</h1>
                <p>{status} · {members.length} membro{members.length === 1 ? '' : 's'}</p>
              </div>
            )}
            <label className="chat-search"><MagnifyingGlassIcon /><input placeholder="Search" /></label>
            <button><Cog6ToothIcon /></button>
            <button><BellIcon /></button>
            <button className="chat-avatar" onClick={() => setProfileModalOpen(true)} title="Editar perfil">{user?.name?.[0] ?? user?.firstName?.[0] ?? 'U'}</button>
          </header>

          <div className="chat-feed" ref={chatFeedRef} onScroll={handleFeedScroll}>
            {loadingConversations || loadingMessages ? (
              <ChatFeedSkeleton />
            ) : (
              <>
                {messages.length === 0 && <p className="empty-chat">Nenhuma mensagem ainda. Manda a primeira e vamos acordar esse chat.</p>}
                {messagesByDay.map(({ label, messages: dayMsgs }) => (
                  <div key={label}>
                    <time className="chat-date">{label}</time>
                    {dayMsgs.map(message => {
                      const own = message.senderId === user?.id;
                      const isEditing = editingId === message.id;
                      return (
                        <article
                          key={message.id}
                          className={`chat-message ${own ? 'own' : ''}${message.deletedAt ? ' deleted' : ''}`}
                          onContextMenu={(event) => openMessageCtx(message, event)}
                        >
                          <span className="message-avatar">{message.senderName.slice(0, 1)}</span>
                          <div>
                            <header>
                              <strong>{own ? 'Você' : message.senderName}</strong>
                              <time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                              {message.editedAt && !message.deletedAt && <span className="edited-label">editado</span>}
                              {own && !message.deletedAt && (
                                <MessageReadStatus message={message} conversation={activeConversation} currentUserId={user?.id} />
                              )}
                            </header>
                            {message.replyTo && !message.deletedAt && (
                              <div className="message-reply-quote">
                                <strong>{message.replyTo.senderName}</strong>
                                <span>{message.replyTo.content}</span>
                              </div>
                            )}
                            {isEditing ? (
                              <form className="message-edit-form" onSubmit={(e) => submitEdit(e, message.id)}>
                                <textarea
                                  value={editDraft}
                                  ref={(el) => {
                                    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 300) + 'px'; el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
                                  }}
                                  onChange={(e) => {
                                    setEditDraft(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(e as unknown as FormEvent<HTMLFormElement>, message.id); } if (e.key === 'Escape') setEditingId(null); }}
                                  maxLength={1000}
                                />
                                <div className="edit-actions">
                                  <button type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                                  <button type="submit" disabled={!editDraft.trim()}>Salvar</button>
                                </div>
                              </form>
                            ) : message.deletedAt ? (
                              <p className="message-deleted">Mensagem apagada</p>
                            ) : (
                              <p>{message.content}</p>
                            )}
                            {(message.reactions?.length ?? 0) > 0 && !message.deletedAt && (
                              <div className="message-reactions">
                                {message.reactions!.map(r => (
                                  <button
                                    key={r.emoji}
                                    className={`reaction-pill${r.userIds.includes(user?.id ?? '') ? ' reacted' : ''}`}
                                    onClick={() => reactToMessage(message.id, r.emoji)}
                                    title={`${r.userIds.length} ${r.userIds.length === 1 ? 'reação' : 'reações'}`}
                                  >
                                    {r.emoji} <span>{r.userIds.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-footer">
            {typingText && (
              <div className="typing-indicator">
                <span className="typing-dots"><i /><i /><i /></span>
                {typingText}
              </div>
            )}
            {error && (
              <div className={`chat-error ${isSessionError ? 'session-expired' : ''}`}>
                <span>{error}</span>
                {isSessionError && <button type="button" onClick={redirectToLogin}>Entrar novamente</button>}
              </div>
            )}
            {replyTo && (
              <div className="composer-reply">
                <ArrowUturnLeftIcon />
                <div>
                  <strong>{replyTo.senderId === user?.id ? 'Você' : replyTo.senderName}</strong>
                  <span>{replyTo.content}</span>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancelar resposta">
                  <XMarkIcon />
                </button>
              </div>
            )}
            <div className="composer-container">
              {clipModalOpen && <ClipModal onClose={closeComposerPopovers} />}
              {composerEmojiOpen && (
                <div className="composer-emoji-wrap">
                  <EmojiPickerDynamic
                    onSelect={insertEmoji}
                    height={360}
                    searchPlaceholder="Buscar emoji..."
                    storageKey={`chatin_composer_emoji_recents_${user?.id ?? 'anonymous'}`}
                  />
                </div>
              )}
              {stickerPanelOpen && (
                <div className="composer-sticker-wrap">
                  <p className="sticker-coming-soon"><SparklesIcon /> Figurinhas em breve</p>
                </div>
              )}
              <form className="chat-composer" onSubmit={submit}>
                <div className="composer-left">
                  <button type="button" className={clipModalOpen ? 'active' : ''} onClick={toggleClip} title="Anexar"><PaperClipIcon /></button>
                  <button type="button" className={composerEmojiOpen ? 'active' : ''} onClick={toggleComposerEmoji} title="Emoji"><FaceSmileIcon /></button>
                  <button type="button" className={stickerPanelOpen ? 'active' : ''} onClick={toggleSticker} title="Figurinhas"><SparklesIcon /></button>
                </div>
                <input
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onFocus={closeComposerPopovers}
                  placeholder="Write a message..."
                  maxLength={1000}
                  disabled={!activeConversationId}
                />
                <button type="submit" disabled={!draft.trim() || !activeConversationId}><PaperAirplaneIcon /></button>
              </form>
            </div>
          </div>
        </section>

        <aside className="chat-details">
          <div className="chat-actions" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <button><PhoneIcon /></button>
            <button><VideoCameraIcon /></button>
            <button><UserGroupIcon /></button>
          </div>
          <section>
            <h2>Members</h2>
            {loadingConversations ? <MembersSkeleton /> : members.map(member => (
              <div className="member-row" key={member.userId}>
                <span>{member.displayName.slice(0, 1)}</span>
                <strong>{member.userId === user?.id ? 'You' : member.displayName}</strong>
                {member.role === 'admin' && <small>Admin</small>}
              </div>
            ))}
          </section>
          <section>
            <h2>Files</h2>
            {loadingConversations ? <FilesSkeleton /> : (
              <>
                <div className="file-row"><PhotoIcon /> 15 photos</div>
                <div className="file-preview" />
                <div className="file-row"><PaperClipIcon /> 208 files</div>
                <div className="file-row"><LinkIcon /> 47 shared links</div>
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MessageReadStatus({ message, conversation, currentUserId }: {
  message: ChatMessage;
  conversation: ChatConversation | null;
  currentUserId: string | undefined;
}) {
  if (!conversation || conversation.type !== 'direct' || !currentUserId) return null;
  const peer = conversation.members.find(m => m.userId !== currentUserId);
  if (!peer) return null;
  const isRead = peer.lastReadAt != null && peer.lastReadAt >= message.createdAt;
  return (
    <span className={`msg-receipt${isRead ? ' read' : ''}`} title={isRead ? 'Lida' : 'Enviada'}>
      <CheckIcon />
      <CheckIcon />
    </span>
  );
}

function DeleteConvModal({ conversation, onClose, onConfirm }: {
  conversation: ChatConversation;
  onClose: () => void;
  onConfirm: (conv: ChatConversation, deleteForAll: boolean) => void;
}) {
  const [deleteForAll, setDeleteForAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(conversation, deleteForAll);
    setLoading(false);
  };

  return (
    <>
      <div className="tag-modal-backdrop" onClick={onClose} />
      <div className="delete-conv-modal" role="dialog" aria-modal="true">
        <div className="delete-conv-icon"><ExclamationTriangleIcon /></div>
        <h2>Excluir conversa</h2>
        <p>
          A conversa com <strong>{conversation.title}</strong> será removida da sua lista.
          A outra pessoa ainda poderá ver o histórico.
        </p>
        <label className="delete-conv-check">
            <input
              type="checkbox"
              checked={deleteForAll}
              onChange={e => setDeleteForAll(e.target.checked)}
            />
            <span>
              <strong>Apagar para todos</strong>
              <small>Remove todo o histórico, mensagens e arquivos para ambos os lados</small>
            </span>
          </label>
        <div className="delete-conv-actions">
          <button type="button" className="tag-btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="tag-btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </>
  );
}

type CreateChatModalProps = {
  contactEmail: string;
  contacts: Array<{ userId: string; displayName: string }>;
  groupTitle: string;
  mode: CreateModalMode;
  search: string;
  onBack: () => void;
  onClose: () => void;
  onContactEmailChange: (v: string) => void;
  onAddContact: (e: FormEvent<HTMLFormElement>) => void;
  onCreateGroup: (e: FormEvent<HTMLFormElement>) => void;
  onGroupTitleChange: (v: string) => void;
  onOpenDirect: (userId: string) => void;
  onSearchChange: (v: string) => void;
  onSelectMode: (mode: CreateModalMode) => void;
};

function CreateChatModal({ contactEmail, contacts, groupTitle, mode, search, onBack, onClose, onContactEmailChange, onAddContact, onCreateGroup, onGroupTitleChange, onOpenDirect, onSearchChange, onSelectMode }: CreateChatModalProps) {
  const filtered = contacts.filter(c => c.displayName.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="create-chat-modal">
      <header>
        <div>
          <span>Novo</span>
          <strong>{mode === 'menu' ? 'Começar algo' : mode === 'conversation' ? 'Nova conversa' : mode === 'contact' ? 'Novo contato' : 'Criar grupo'}</strong>
        </div>
        <button type="button" onClick={onClose}>×</button>
      </header>
      {mode === 'menu' && (
        <div className="create-options">
          <button type="button" onClick={() => onSelectMode('conversation')}>
            <span className="create-option-icon"><PaperAirplaneIcon /></span>
            <span><strong>Nova Conversa</strong><small>Escolha alguém da sua lista</small></span>
          </button>
          <button type="button" onClick={() => onSelectMode('contact')}>
            <span className="create-option-icon"><UserPlusIcon /></span>
            <span><strong>Novo Contato</strong><small>Adicione alguém pelo e-mail</small></span>
          </button>
          <button type="button" onClick={() => onSelectMode('group')}>
            <span className="create-option-icon"><UserGroupIcon /></span>
            <span><strong>Criar Grupo</strong><small>Crie uma sala para o time</small></span>
          </button>
        </div>
      )}
      {mode === 'conversation' && (
        <div className="create-section">
          <button className="modal-back" type="button" onClick={onBack}>← Voltar</button>
          <label className="modal-search">
            <MagnifyingGlassIcon />
            <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar contato..." autoFocus />
          </label>
          {contacts.length === 0 ? (
            <p className="modal-empty">Você ainda não tem contatos. Adicione alguém antes de iniciar uma conversa.</p>
          ) : filtered.length === 0 ? (
            <p className="modal-empty">Nenhum contato encontrado para "{search}".</p>
          ) : (
            <div className="contact-picker">
              {filtered.map(c => (
                <button type="button" key={c.userId} onClick={() => onOpenDirect(c.userId)}>
                  <span>{getInitials(c.displayName)}</span>
                  <strong>{c.displayName}</strong>
                  <small>Iniciar conversa</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {mode === 'contact' && (
        <form className="create-section" onSubmit={onAddContact}>
          <button className="modal-back" type="button" onClick={onBack}>← Voltar</button>
          <label>E-mail do contato<input value={contactEmail} onChange={(e) => onContactEmailChange(e.target.value)} placeholder="pessoa@email.com" type="email" /></label>
          <p className="modal-hint">Ao adicionar, uma conversa direta será criada e o contato ficará disponível na sua lista.</p>
          <button className="modal-primary" type="submit" disabled={!contactEmail.trim()}>Adicionar contato</button>
        </form>
      )}
      {mode === 'group' && (
        <form className="create-section" onSubmit={onCreateGroup}>
          <button className="modal-back" type="button" onClick={onBack}>← Voltar</button>
          <label>Nome do grupo<input value={groupTitle} onChange={(e) => onGroupTitleChange(e.target.value)} placeholder="Ex: Time frontend" maxLength={80} autoFocus /></label>
          <button className="modal-primary" type="submit" disabled={!groupTitle.trim()}>Criar grupo</button>
        </form>
      )}
    </div>
  );
}

function ClipModal({ onClose }: { onClose: () => void }) {
  const options = [
    { label: 'Documento', desc: 'PDF, Word, Excel e mais', icon: <DocumentIcon /> },
    { label: 'Imagens', desc: 'Fotos e vídeos da galeria', icon: <PhotoIcon /> },
    { label: 'Áudio', desc: 'MP3, WAV, M4A e mais', icon: <MicrophoneIcon /> },
    { label: 'Enquete', desc: 'Crie uma votação no grupo', icon: <ChartBarIcon /> },
  ];
  return (
    <div className="clip-modal">
      <div className="clip-modal-header">
        <span>Anexar</span>
      </div>
      {options.map(opt => (
        <button key={opt.label} type="button" className="clip-modal-option" onClick={onClose}>
          <span className="clip-modal-icon">{opt.icon}</span>
          <div className="clip-modal-text">
            <strong>{opt.label}</strong>
            <small>{opt.desc}</small>
          </div>
        </button>
      ))}
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="conversation-skeleton-list" aria-label="Carregando conversas">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="conversation-card skeleton-card" key={i}>
          <span className="skeleton-circle" /><strong className="skeleton-line" /><small className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

function ChatFeedSkeleton() {
  return (
    <div className="chat-feed-skeleton" aria-label="Carregando mensagens">
      <div className="chat-cover skeleton-cover">
        <span className="skeleton-icon" />
        <div><span className="skeleton-line title" /><span className="skeleton-line subtitle" /></div>
      </div>
      <span className="chat-date skeleton-pill" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div className={`chat-message skeleton-message ${i % 2 ? 'own' : ''}`} key={i}>
          <span className="message-avatar skeleton-circle" />
          <div>
            <header><strong className="skeleton-line name" /><time className="skeleton-line time" /></header>
            <p className="skeleton-bubble" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="member-row skeleton-member" key={i}>
          <span className="skeleton-circle" /><strong className="skeleton-line" />
          {i === 0 && <small className="skeleton-line tag" />}
        </div>
      ))}
    </>
  );
}

function FilesSkeleton() {
  return (
    <div className="files-skeleton">
      <span className="skeleton-line file-title" />
      <div className="file-preview skeleton-preview" />
      <span className="skeleton-line file-row-line" />
      <span className="skeleton-line file-row-line short" />
    </div>
  );
}

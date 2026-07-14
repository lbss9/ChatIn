'use client';

import {
  ArrowPathIcon,
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
import { ClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const EmojiPickerDynamic = dynamic(() => import('../../../shared/components/emoji-picker/emoji-picker'), { ssr: false });
import { authApi, clearAuthSession, saveAuthSession } from '../../auth/api/auth-api';
import { chatApi, type ChatConversation, type UploadedChatFile } from '../api/chat-api';
import { chatCache } from '../cache/chat-cache';
import { ContextMenu, useContextMenu, type ContextMenuItem } from '../../../shared/components/context-menu';
import { tagsApi, resolveImageUrl, type Tag } from '../../tags/api/tags-api';
import TagModal from '../../tags/components/tag-modal';
import { useEmojiHistory } from '../../../shared/hooks/use-emoji-history';
import ProfileModal from '../../profile/components/profile-modal';
import { profileApi, type UserProfile } from '../../profile/api/profile-api';

type StoredUser = UserProfile & { firstName?: string; lastName?: string };
type MessageReplyContext = { id: string; senderName: string; content: string };
type MessageReaction = { emoji: string; userIds: string[] };
type MessageAttachment = UploadedChatFile;
type MessagePollOption = { id: string; text: string; voterIds: string[] };
type MessagePoll = { question: string; options: MessagePollOption[]; allowMultiple: boolean; closedAt?: string | null };
type PendingImageItem = { id: string; file: File; previewUrl: string; rotation: number };
type SelectedMedia = { url: string; name: string; type: 'image' | 'video'; mimeType: string };
type ReactionModalState = { messageId: string; emoji: string };
type FilesPanelTab = 'media' | 'files' | 'links';
type SharedFileItem = {
  id: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'link';
  messageId: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  content?: string;
};
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
  attachments?: MessageAttachment[];
  poll?: MessagePoll | null;
  pending?: boolean;
};
type CreateModalMode = 'menu' | 'conversation' | 'contact' | 'group';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3003/chat';
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api').replace(/\/api\/?$/, '');
const MAX_SELECTED_TAGS = 3;
const LINK_MATCHER = /https?:\/\/[^\s]+/g;

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

function resolveFileUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function countLinks(messages: ChatMessage[]) {
  return messages.reduce((total, message) => total + (message.content.match(LINK_MATCHER)?.length ?? 0), 0);
}

function getUrlLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getClipboardImageFiles(event: ClipboardEvent<HTMLInputElement>) {
  const items = Array.from(event.clipboardData.items);
  const imageFiles = items
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (imageFiles.length > 0) return imageFiles.map(normalizeClipboardImageFile).slice(0, 4);

  return Array.from(event.clipboardData.files)
    .filter((file) => file.type.startsWith('image/'))
    .map(normalizeClipboardImageFile)
    .slice(0, 4);
}

function normalizeClipboardImageFile(file: File, index: number) {
  if (file.name && file.name !== 'image.png') return file;
  const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  return new File([file], `imagem-colada-${Date.now()}-${index + 1}.${extension}`, {
    type: file.type || 'image/png',
    lastModified: Date.now(),
  });
}

function rotateImageFile(file: File, rotation: number) {
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  if (normalizedRotation === 0) return Promise.resolve(file);

  return new Promise<File>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível editar a imagem.'));
        return;
      }

      const swapsSize = normalizedRotation === 90 || normalizedRotation === 270;
      canvas.width = swapsSize ? image.naturalHeight : image.naturalWidth;
      canvas.height = swapsSize ? image.naturalWidth : image.naturalHeight;
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((normalizedRotation * Math.PI) / 180);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error('Não foi possível editar a imagem.'));
          return;
        }
        resolve(new File([blob], file.name, { type: file.type || 'image/png', lastModified: Date.now() }));
      }, file.type || 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem.'));
    };
    image.src = url;
  });
}

function applyReaction(reactions: MessageReaction[], emoji: string, userId: string, action: 'add' | 'remove'): MessageReaction[] {
  const next = reactions.map(r => ({ ...r, userIds: [...r.userIds] }));
  if (action === 'add') {
    next.forEach(r => { r.userIds = r.userIds.filter(id => id !== userId); });
  }
  const found = next.find(r => r.emoji === emoji);
  if (action === 'add') {
    if (found) found.userIds.push(userId);
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
  const currentUserIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const spectrumFrameRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const messageRefs = useRef<Record<string, HTMLElement | null>>({});
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

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
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImageItem[]>([]);
  const [activePendingImageId, setActivePendingImageId] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [imageEmojiOpen, setImageEmojiOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [reactionModal, setReactionModal] = useState<ReactionModalState | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSpectrum, setRecordingSpectrum] = useState<number[]>(Array(18).fill(8));
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [editingPollMessage, setEditingPollMessage] = useState<ChatMessage | null>(null);
  const [deleteConvTarget, setDeleteConvTarget] = useState<ChatConversation | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [filesTab, setFilesTab] = useState<FilesPanelTab>('media');
  const [filesSearch, setFilesSearch] = useState('');
  const [filesSenderFilter, setFilesSenderFilter] = useState('all');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const { menu: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu();
  const { record: recordEmoji, getTop: getTopEmojis } = useEmojiHistory(user?.id);

  const isSessionError = error.toLowerCase().includes('sessão inválida') || error.toLowerCase().includes('session');

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const members = activeConversation?.members ?? [];

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

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

  const fileStats = useMemo(() => {
    const attachments = messages.flatMap((message) => message.attachments ?? []);
    const photos = attachments.filter((attachment) => attachment.type === 'image');
    const videos = attachments.filter((attachment) => attachment.type === 'video');
    const audios = attachments.filter((attachment) => attachment.type === 'audio');
    const files = attachments.filter((attachment) => attachment.type === 'document');
    return {
      photos: photos.length,
      videos: videos.length,
      audios: audios.length,
      files: files.length,
      links: countLinks(messages),
      previewUrl: photos.at(-1)?.url ?? null,
    };
  }, [messages]);

  const sharedFileItems = useMemo<SharedFileItem[]>(() => {
    return messages.flatMap((message) => {
      if (message.deletedAt) return [];
      const attachmentItems = (message.attachments ?? []).map((attachment, index) => ({
        id: `${message.id}-attachment-${index}`,
        kind: attachment.type,
        messageId: message.id,
        senderId: message.senderId,
        senderName: message.senderName,
        createdAt: message.createdAt,
        name: attachment.name,
        url: resolveFileUrl(attachment.url),
        mimeType: attachment.mimeType,
        size: attachment.size,
      }));
      const linkItems = Array.from(message.content.matchAll(LINK_MATCHER)).map((match, index) => {
        const url = match[0];
        return {
          id: `${message.id}-link-${index}`,
          kind: 'link' as const,
          messageId: message.id,
          senderId: message.senderId,
          senderName: message.senderName,
          createdAt: message.createdAt,
          name: getUrlLabel(url),
          url,
          content: message.content,
        };
      });
      return [...attachmentItems, ...linkItems];
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages]);

  const filesPanelSenders = useMemo(() => {
    const senders = new Map<string, string>();
    sharedFileItems.forEach((item) => senders.set(item.senderId, item.senderId === user?.id ? 'Você' : item.senderName));
    return Array.from(senders.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sharedFileItems, user?.id]);

  const filteredFilesPanelItems = useMemo(() => {
    const query = filesSearch.trim().toLowerCase();
    return sharedFileItems.filter((item) => {
      if (filesTab === 'media' && item.kind !== 'image' && item.kind !== 'video' && item.kind !== 'audio') return false;
      if (filesTab === 'files' && item.kind !== 'document') return false;
      if (filesTab === 'links' && item.kind !== 'link') return false;
      if (filesSenderFilter !== 'all' && item.senderId !== filesSenderFilter) return false;
      if (!query) return true;
      return [item.name, item.url, item.senderName, item.content ?? ''].some((value) => value.toLowerCase().includes(query));
    });
  }, [filesSearch, filesSenderFilter, filesTab, sharedFileItems]);

  const activePendingImage = useMemo(
    () => pendingImages.find((image) => image.id === activePendingImageId) ?? pendingImages[0] ?? null,
    [activePendingImageId, pendingImages],
  );

  const loadConversations = async (preferredId?: string, selectPreferred = false) => {
    setLoadingConversations(true);
    const cached = chatCache.readConversations(currentUserIdRef.current);
    if (cached.length) {
      setConversations(cached);
      setActiveConversationId(current => {
        if (selectPreferred && preferredId && cached.some(c => c.id === preferredId)) return preferredId;
        if (current && cached.some(c => c.id === current)) return current;
        return cached[0]?.id ?? null;
      });
      setLoadingConversations(false);
    }
    const next = await chatApi.listConversations();
    chatCache.writeConversations(currentUserIdRef.current, next);
    setConversations(next);
    setActiveConversationId(current => {
      if (selectPreferred && preferredId && next.some(c => c.id === preferredId)) return preferredId;
      if (current && next.some(c => c.id === current)) return current;
      return next[0]?.id ?? null;
    });
    setLoadingConversations(false);
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem('chatin_user');
    if (!storedUser) {
      authApi.refresh()
        .then((session) => {
          saveAuthSession(session);
          currentUserIdRef.current = session.user.id;
          setUser(session.user as StoredUser);
          loadConversations().catch(err => setError(err instanceof Error ? err.message : 'Não foi possível carregar as conversas.'));
          tagsApi.list().then(setTags).catch(() => {});
        })
        .catch(() => {
          clearAuthSession();
          router.replace('/login');
        });
    } else {
      const parsedUser = JSON.parse(storedUser) as StoredUser;
      currentUserIdRef.current = parsedUser.id;
      setUser(parsedUser);
      profileApi.me().then((profile) => setUser(profile as StoredUser)).catch(() => {});
      loadConversations().catch(err => setError(err instanceof Error ? err.message : 'Não foi possível carregar as conversas.'));
      tagsApi.list().then(setTags).catch(() => {});
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'], withCredentials: true });
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
        chatCache.writeMessages(currentUserIdRef.current, payload.conversationId, payload.messages);
        setLoadingMessages(false);
        isNearBottomRef.current = true;
      }
    });

    socket.on('chat:conversation-updated', (payload: { conversationId?: string }) => {
      void loadConversations(payload.conversationId);
    });

    socket.on('chat:message', (message: ChatMessage) => {
      setConversations(current => {
        if (!current.some(c => c.id === message.conversationId)) {
          void loadConversations(message.conversationId);
          return current;
        }
        return current.map(c => c.id === message.conversationId
          ? { ...c, lastMessagePreview: message.content, lastMessageAt: message.createdAt }
          : c);
      });
      if (message.conversationId === activeConversationRef.current) {
        setMessages(current => {
          const next = current.some(m => m.id === message.id || (m.pending && m.senderId === message.senderId && m.content === message.content))
            ? current.map(m => (m.id === message.id || (m.pending && m.senderId === message.senderId && m.content === message.content)) ? message : m)
            : [...current, message];
          chatCache.writeMessages(currentUserIdRef.current, message.conversationId, next);
          return next;
        });
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
      setMessages(current => {
        const next = current.map(m => m.id === payload.messageId ? { ...m, content: payload.content, editedAt: payload.editedAt } : m);
        if (activeConversationRef.current) chatCache.writeMessages(currentUserIdRef.current, activeConversationRef.current, next);
        return next;
      });
    });
    socket.on('chat:message-deleted', (payload: { messageId: string; deletedAt: string }) => {
      setMessages(current => {
        const next = current.map(m => m.id === payload.messageId ? { ...m, deletedAt: payload.deletedAt } : m);
        if (activeConversationRef.current) chatCache.writeMessages(currentUserIdRef.current, activeConversationRef.current, next);
        return next;
      });
    });
    socket.on('chat:message-updated', (message: ChatMessage) => {
      setMessages(current => {
        const next = current.map(m => m.id === message.id ? message : m);
        if (message.conversationId === activeConversationRef.current) chatCache.writeMessages(currentUserIdRef.current, message.conversationId, next);
        return next;
      });
    });
    socket.on('chat:reaction', (payload: { messageId: string; emoji: string; userId: string; action: 'add' | 'remove' }) => {
      setMessages(current => {
        const next = current.map(m => m.id !== payload.messageId ? m : {
          ...m, reactions: applyReaction(m.reactions ?? [], payload.emoji, payload.userId, payload.action),
        });
        if (activeConversationRef.current) chatCache.writeMessages(currentUserIdRef.current, activeConversationRef.current, next);
        return next;
      });
    });

    socket.on('chat:read-receipt', (payload: { conversationId: string; userId: string; readAt: string }) => {
      setConversations(current => current.map(c => {
        if (c.id !== payload.conversationId) return c;
        return {
          ...c,
          members: c.members.map(m => m.userId === payload.userId ? { ...m, lastReadAt: payload.readAt } : m),
          ...(payload.userId === (JSON.parse(sessionStorage.getItem('chatin_user') ?? '{}') as StoredUser)?.id
            ? { lastReadAt: payload.readAt }
            : {}),
        };
      }));
    });

    socket.on('chat:error', async (payload: { message: string }) => {
      const isSession = ['sessão', 'session', 'unauthorized', 'token'].some(k => payload.message.toLowerCase().includes(k));
      if (isSession) {
        try {
          const session = await authApi.refresh();
          saveAuthSession(session);
          socket.connect();
        } catch {
          clearAuthSession();
          router.replace('/login');
        }
      } else {
        setError(payload.message);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopRecordingResources();
    };
  }, [router]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
    const cachedMessages = activeConversationId ? chatCache.readMessages(currentUserIdRef.current, activeConversationId) : [];
    setMessages(cachedMessages);
    setError('');
    setTypingUsers([]);
    setReplyTo(null);
    setEditingId(null);
    isNearBottomRef.current = true;
    setLoadingMessages(Boolean(activeConversationId) && cachedMessages.length === 0);
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

  const stopVoiceSpectrum = () => {
    if (spectrumFrameRef.current) {
      cancelAnimationFrame(spectrumFrameRef.current);
      spectrumFrameRef.current = null;
    }
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setRecordingSpectrum(Array(18).fill(8));
  };

  const startVoiceSpectrum = (stream: MediaStream) => {
    stopVoiceSpectrum();
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioContext;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = Array.from({ length: 18 }, (_, index) => {
        const value = data[index + 2] ?? 0;
        return Math.max(6, Math.min(34, Math.round((value / 255) * 34)));
      });
      setRecordingSpectrum(bars);
      spectrumFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopRecordingResources = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopVoiceSpectrum();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  };

  const startVoiceRecording = async () => {
    if (recording || uploadingAttachment || !activeConversationId) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Seu navegador não suporta gravação de áudio.');
      return;
    }

    try {
      closeComposerPopovers();
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      startVoiceSpectrum(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopRecordingResources();
      };

      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch {
      stopRecordingResources();
      setError('Não foi possível acessar o microfone.');
    }
  };

  const cancelVoiceRecording = () => {
    recordingChunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else stopRecordingResources();
  };

  const finishVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
      recordingChunksRef.current = [];
      stopRecordingResources();
      if (blob.size === 0) return;
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      sendUploadedFile(file);
    };
    recorder.stop();
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
    const optimisticMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      conversationId: activeConversationId,
      senderId: user?.id ?? 'me',
      senderName: user?.name ?? 'Você',
      content,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.content } : null,
      reactions: [],
      attachments: [],
      poll: null,
      pending: true,
    };
    setMessages(current => [...current, optimisticMessage]);
    socketRef.current.emit('chat:message', { conversationId: activeConversationId, content, replyToId: replyTo?.id ?? null });
    setDraft('');
    setReplyTo(null);
    stopTypingEmit();
  };

  const openImagePreview = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/')).slice(0, 4);
    if (!images.length) return;
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    const items = images.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name || 'imagem'}`,
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
    }));
    setPendingImages(items);
    setActivePendingImageId(items[0]?.id ?? null);
    setImageCaption('');
    setImageEmojiOpen(false);
    closeComposerPopovers();
  };

  const closeImagePreview = () => {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
    setActivePendingImageId(null);
    setImageCaption('');
    setImageEmojiOpen(false);
  };

  const rotatePendingImage = () => {
    if (!activePendingImage) return;
    setPendingImages((current) => current.map((image) => (
      image.id === activePendingImage.id ? { ...image, rotation: image.rotation + 90 } : image
    )));
  };

  const removePendingImage = (id: string) => {
    setPendingImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((image) => image.id !== id);
      if (!next.length) {
        setActivePendingImageId(null);
        setImageCaption('');
        setImageEmojiOpen(false);
      } else if (activePendingImageId === id) {
        setActivePendingImageId(next[0].id);
      }
      return next;
    });
  };

  const sendPendingImages = async () => {
    if (!pendingImages.length || uploadingAttachment) return;
    try {
      const files = await Promise.all(pendingImages.map((image) => rotateImageFile(image.file, image.rotation)));
      await sendUploadedFiles(files, imageCaption.trim());
      closeImagePreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível preparar a imagem.');
    }
  };

  const sendUploadedFiles = async (files: File[], content = '') => {
    if (!files.length || !socketRef.current?.connected || !activeConversationId) return;
    setUploadingAttachment(true);
    setError('');
    try {
      const uploaded = await Promise.all(files.slice(0, 4).map((file) => chatApi.uploadFile(file)));
      socketRef.current.emit('chat:message', {
        conversationId: activeConversationId,
        content,
        attachments: uploaded,
        replyToId: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setUploadingAttachment(false);
      closeComposerPopovers();
    }
  };

  const sendUploadedFile = (file: File | undefined) => {
    if (!file) return;
    void sendUploadedFiles([file]);
  };

  const handleComposerPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const imageFiles = getClipboardImageFiles(event);
    if (!imageFiles.length) return;
    event.preventDefault();
    if (uploadingAttachment) return;
    openImagePreview(imageFiles);
  };

  const openPollModal = (message: ChatMessage | null = null) => {
    setEditingPollMessage(message);
    setPollModalOpen(true);
    closeComposerPopovers();
  };

  const savePoll = (poll: { question: string; options: string[]; allowMultiple: boolean }) => {
    if (!socketRef.current?.connected || !activeConversationId) return;
    if (editingPollMessage) {
      socketRef.current.emit('chat:poll-update', {
        messageId: editingPollMessage.id,
        question: poll.question,
        options: poll.options.map((text, index) => ({
          id: editingPollMessage.poll?.options[index]?.id,
          text,
          voterIds: editingPollMessage.poll?.options[index]?.voterIds ?? [],
        })),
        allowMultiple: poll.allowMultiple,
      });
    } else {
      socketRef.current.emit('chat:poll-create', {
        conversationId: activeConversationId,
        question: poll.question,
        options: poll.options.map((text) => ({ text })),
        allowMultiple: poll.allowMultiple,
      });
    }
    setPollModalOpen(false);
    setEditingPollMessage(null);
  };

  const deletePoll = (messageId: string) => {
    socketRef.current?.emit('chat:poll-delete', { messageId });
  };

  const votePoll = (messageId: string, optionId: string) => {
    socketRef.current?.emit('chat:poll-vote', { messageId, optionId });
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

  const goToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (!element) return;
    setHighlightedMessageId(messageId);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setHighlightedMessageId((current) => current === messageId ? null : current), 1800);
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
      await loadConversations(conversation.id, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conversa.');
    }
  };

  const openDirectConversation = async (targetUserId: string) => {
    try {
      const conversation = await chatApi.openDirect(targetUserId);
      closeCreateModal();
      await loadConversations(conversation.id, true);
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
      await loadConversations(conversation.id, true);
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
      {pendingImages.length > 0 && (
        <ImagePreviewModal
          activeImage={activePendingImage}
          caption={imageCaption}
          emojiOpen={imageEmojiOpen}
          images={pendingImages}
          uploading={uploadingAttachment}
          onCaptionChange={setImageCaption}
          onClose={closeImagePreview}
          onEmojiSelect={(emoji) => {
            setImageCaption((current) => current + emoji);
            setImageEmojiOpen(false);
          }}
          onRemove={removePendingImage}
          onRotate={rotatePendingImage}
          onSelect={setActivePendingImageId}
          onSend={() => void sendPendingImages()}
          onToggleEmoji={() => setImageEmojiOpen((current) => !current)}
        />
      )}
      {selectedMedia && (
        <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
      {createModalOpen && <button className="modal-backdrop" type="button" aria-label="Fechar" onClick={closeCreateModal} />}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          openImagePreview(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(event) => void sendUploadedFile(event.target.files?.[0])} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" hidden onChange={(event) => void sendUploadedFile(event.target.files?.[0])} />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(event) => void sendUploadedFile(event.target.files?.[0])}
      />
      {pollModalOpen && (
        <PollModal
          message={editingPollMessage}
          onClose={() => { setPollModalOpen(false); setEditingPollMessage(null); }}
          onSave={savePoll}
        />
      )}

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
            <label className="chat-search"><MagnifyingGlassIcon /><input placeholder="Buscar" /></label>
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
                          ref={(element) => { messageRefs.current[message.id] = element; }}
                          className={`chat-message ${own ? 'own' : ''}${message.deletedAt ? ' deleted' : ''}${highlightedMessageId === message.id ? ' highlighted' : ''}`}
                          onContextMenu={(event) => openMessageCtx(message, event)}
                        >
                          <span className="message-avatar">{message.senderName.slice(0, 1)}</span>
                          <div>
                            <header>
                              <strong>{own ? 'Você' : message.senderName}</strong>
                              <time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                              {message.pending && <span className="pending-label">enviando</span>}
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
                            ) : message.content ? (
                              <p>{message.content}</p>
                            ) : null}
                            {(message.attachments?.length ?? 0) > 0 && !message.deletedAt && (
                              <MessageAttachments attachments={message.attachments!} onOpenMedia={setSelectedMedia} />
                            )}
                            {message.poll && !message.deletedAt && (
                              <MessagePollCard
                                currentUserId={user?.id}
                                message={message}
                                onDelete={() => deletePoll(message.id)}
                                onEdit={() => openPollModal(message)}
                                onVote={(optionId) => votePoll(message.id, optionId)}
                              />
                            )}
                            {(message.reactions?.length ?? 0) > 0 && !message.deletedAt && (
                              <MessageReactions
                                currentUserId={user?.id}
                                members={members}
                                message={message}
                                modalEmoji={reactionModal?.messageId === message.id ? reactionModal.emoji : null}
                                onCloseModal={() => setReactionModal(null)}
                                onOpenModal={(emoji) => setReactionModal({ messageId: message.id, emoji })}
                                onReact={(emoji) => reactToMessage(message.id, emoji)}
                                onRemoveOwnReaction={(emoji) => reactToMessage(message.id, emoji)}
                              />
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
              {clipModalOpen && (
                <ClipModal
                  onClose={closeComposerPopovers}
                  onAudio={() => audioInputRef.current?.click()}
                  onDocument={() => documentInputRef.current?.click()}
                  onImage={() => imageInputRef.current?.click()}
                  onPoll={() => openPollModal()}
                  onVideo={() => videoInputRef.current?.click()}
                />
              )}
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
                  <button type="button" className={clipModalOpen ? 'active' : ''} onClick={toggleClip} title="Anexar" disabled={uploadingAttachment}><PaperClipIcon /></button>
                  <button type="button" className={composerEmojiOpen ? 'active' : ''} onClick={toggleComposerEmoji} title="Emoji"><FaceSmileIcon /></button>
                  <button type="button" className={stickerPanelOpen ? 'active' : ''} onClick={toggleSticker} title="Figurinhas"><SparklesIcon /></button>
                  <button type="button" className={recording ? 'active' : ''} onClick={() => void startVoiceRecording()} disabled={!activeConversationId || uploadingAttachment || recording} title="Gravar áudio"><MicrophoneIcon /></button>
                </div>
                {recording ? (
                  <div className="voice-recorder">
                    <span className="recording-dot" />
                    <strong>{formatRecordingTime(recordingSeconds)}</strong>
                    <div className="voice-spectrum" aria-hidden="true">
                      {recordingSpectrum.map((height, index) => (
                        <span key={index} style={{ height }} />
                      ))}
                    </div>
                    <button type="button" onClick={cancelVoiceRecording} title="Cancelar gravação"><TrashIcon /></button>
                    <button type="button" onClick={finishVoiceRecording} title="Enviar áudio"><PaperAirplaneIcon /></button>
                  </div>
                ) : (
                  <>
                    <input
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      onPaste={handleComposerPaste}
                      onFocus={closeComposerPopovers}
                      placeholder={uploadingAttachment ? 'Enviando arquivo...' : 'Escreva uma mensagem...'}
                      maxLength={1000}
                      disabled={!activeConversationId || uploadingAttachment}
                    />
                    <button type="submit" disabled={!draft.trim() || !activeConversationId || uploadingAttachment}><PaperAirplaneIcon /></button>
                  </>
                )}
              </form>
            </div>
          </div>
        </section>

        <aside className="chat-details">
          <div className="chat-actions">
            <button disabled title="Chamada de voz indisponível"><PhoneIcon /></button>
            <button disabled title="Chamada de vídeo indisponível"><VideoCameraIcon /></button>
          </div>
          <section>
            <h2>Membros</h2>
            {loadingConversations ? <MembersSkeleton /> : members.map(member => (
              <div className="member-row" key={member.userId}>
                <span>{member.displayName.slice(0, 1)}</span>
                <strong>{member.userId === user?.id ? 'Você' : member.displayName}</strong>
                {member.role === 'admin' && <small>Administrador</small>}
              </div>
            ))}
          </section>
          <section>
            {loadingConversations ? <FilesSkeleton /> : (
              <FilesPanel
                activeTab={filesTab}
                currentUserId={user?.id}
                filteredItems={filteredFilesPanelItems}
                items={sharedFileItems}
                search={filesSearch}
                senderFilter={filesSenderFilter}
                senders={filesPanelSenders}
                stats={fileStats}
                onAddFile={() => documentInputRef.current?.click()}
                onOpenMedia={setSelectedMedia}
                onSearchChange={setFilesSearch}
                onSenderFilterChange={setFilesSenderFilter}
                onTabChange={setFilesTab}
                onViewMessage={goToMessage}
              />
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilesPanel({
  activeTab,
  currentUserId,
  filteredItems,
  items,
  search,
  senderFilter,
  senders,
  stats,
  onAddFile,
  onOpenMedia,
  onSearchChange,
  onSenderFilterChange,
  onTabChange,
  onViewMessage,
}: {
  activeTab: FilesPanelTab;
  currentUserId?: string;
  filteredItems: SharedFileItem[];
  items: SharedFileItem[];
  search: string;
  senderFilter: string;
  senders: Array<{ id: string; name: string }>;
  stats: { photos: number; videos: number; audios: number; files: number; links: number; previewUrl: string | null };
  onAddFile: () => void;
  onOpenMedia: (media: SelectedMedia) => void;
  onSearchChange: (value: string) => void;
  onSenderFilterChange: (value: string) => void;
  onTabChange: (tab: FilesPanelTab) => void;
  onViewMessage: (messageId: string) => void;
}) {
  const mediaCount = stats.photos + stats.videos + stats.audios;
  const latestMedia = items.find((item) => item.kind === 'image' || item.kind === 'video');
  const tabCounts: Record<FilesPanelTab, number> = {
    media: mediaCount,
    files: stats.files,
    links: stats.links,
  };

  const clearFilters = () => {
    onSearchChange('');
    onSenderFilterChange('all');
  };

  return (
    <div className="files-panel">
      <header>
        <h2>Arquivos</h2>
        <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
      </header>

      <div className="files-summary-grid">
        <button type="button" onClick={() => onTabChange('media')} className={activeTab === 'media' ? 'active' : ''}>
          <PhotoIcon />
          <span>{stats.photos} foto{stats.photos === 1 ? '' : 's'}</span>
          <small>{stats.videos} vídeo{stats.videos === 1 ? '' : 's'} · {stats.audios} áudio{stats.audios === 1 ? '' : 's'}</small>
        </button>
        <button type="button" onClick={() => onTabChange('files')} className={activeTab === 'files' ? 'active' : ''}>
          <PaperClipIcon />
          <span>{stats.files} arquivo{stats.files === 1 ? '' : 's'}</span>
          <small>Documentos enviados</small>
        </button>
        <button type="button" onClick={() => onTabChange('links')} className={activeTab === 'links' ? 'active' : ''}>
          <LinkIcon />
          <span>{stats.links} link{stats.links === 1 ? '' : 's'}</span>
          <small>Links compartilhados</small>
        </button>
      </div>

      {latestMedia && (
        <button
          type="button"
          className="files-featured-preview"
          onClick={() => latestMedia.kind === 'image' || latestMedia.kind === 'video'
            ? onOpenMedia({ url: latestMedia.url, name: latestMedia.name, type: latestMedia.kind, mimeType: latestMedia.mimeType ?? '' })
            : onViewMessage(latestMedia.messageId)}
          style={latestMedia.kind === 'image' ? { backgroundImage: `url("${latestMedia.url}")` } : undefined}
        >
          {latestMedia.kind === 'video' && <video src={latestMedia.url} muted preload="metadata" playsInline />}
          <span>{latestMedia.kind === 'video' ? 'Último vídeo' : 'Última mídia'}</span>
        </button>
      )}

      <div className="files-tabs" role="tablist" aria-label="Arquivos da conversa">
        {(['media', 'files', 'links'] as FilesPanelTab[]).map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} type="button" onClick={() => onTabChange(tab)}>
            {tab === 'media' ? 'Mídia' : tab === 'files' ? 'Arquivos' : 'Links'} <span>{tabCounts[tab]}</span>
          </button>
        ))}
      </div>

      <div className="files-filters">
        <label>
          <MagnifyingGlassIcon />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar arquivos..." />
        </label>
        <select value={senderFilter} onChange={(event) => onSenderFilterChange(event.target.value)} aria-label="Filtrar por pessoa">
          <option value="all">Todos</option>
          {senders.map((sender) => (
            <option key={sender.id} value={sender.id}>{sender.name}</option>
          ))}
        </select>
      </div>

      <div className="files-list">
        {filteredItems.slice(0, 12).map((item) => (
          <FilesPanelItem
            currentUserId={currentUserId}
            item={item}
            key={item.id}
            onOpenMedia={onOpenMedia}
            onViewMessage={onViewMessage}
          />
        ))}
        {filteredItems.length === 0 && (
          <div className="files-empty">
            <DocumentIcon />
            <strong>Nada encontrado</strong>
            <span>{items.length === 0 ? 'Ainda não há arquivos, mídias ou links nessa conversa.' : 'Tente outro termo ou filtro.'}</span>
            {items.length === 0 && <button type="button" onClick={onAddFile}>Enviar arquivo</button>}
            {items.length > 0 && (search || senderFilter !== 'all') && <button type="button" onClick={clearFilters}>Limpar filtros</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function FilesPanelItem({
  currentUserId,
  item,
  onOpenMedia,
  onViewMessage,
}: {
  currentUserId?: string;
  item: SharedFileItem;
  onOpenMedia: (media: SelectedMedia) => void;
  onViewMessage: (messageId: string) => void;
}) {
  const sender = item.senderId === currentUserId ? 'Você' : item.senderName;
  const openItem = () => {
    if (item.kind === 'image' || item.kind === 'video') {
      onOpenMedia({ url: item.url, name: item.name, type: item.kind, mimeType: item.mimeType ?? '' });
      return;
    }
    window.open(item.url, '_blank', 'noopener');
  };

  return (
    <article className={`files-item ${item.kind}`}>
      <button className="files-item-main" type="button" onClick={openItem}>
        <span className="files-item-thumb">
          {item.kind === 'image' && <img src={item.url} alt={item.name} />}
          {item.kind === 'video' && <video src={item.url} muted preload="metadata" playsInline />}
          {item.kind === 'audio' && <MicrophoneIcon />}
          {item.kind === 'document' && <DocumentIcon />}
          {item.kind === 'link' && <LinkIcon />}
        </span>
        <span className="files-item-text">
          <strong>{item.kind === 'link' ? item.url : item.name}</strong>
          <small>{sender} · {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}{item.size ? ` · ${formatFileSize(item.size)}` : ''}</small>
        </span>
      </button>
      <div className="files-item-actions">
        <button type="button" onClick={() => onViewMessage(item.messageId)}>Ver no chat</button>
        {item.kind === 'link' ? (
          <button type="button" onClick={() => navigator.clipboard.writeText(item.url)}>Copiar</button>
        ) : (
          <a href={item.url} target="_blank" rel="noreferrer">Abrir</a>
        )}
      </div>
    </article>
  );
}

function MessageAttachments({ attachments, onOpenMedia }: { attachments: MessageAttachment[]; onOpenMedia: (media: SelectedMedia) => void }) {
  return (
    <div className="message-attachments">
      {attachments.map((attachment) => {
        const url = resolveFileUrl(attachment.url);
        if (attachment.type === 'image') {
          return (
            <button
              key={attachment.url}
              className="message-media-button"
              type="button"
              onClick={() => onOpenMedia({ url, name: attachment.name, type: 'image', mimeType: attachment.mimeType })}
            >
              <img className="message-image" src={url} alt={attachment.name} />
            </button>
          );
        }
        if (attachment.type === 'video') {
          return (
            <button
              key={attachment.url}
              className="message-media-button video"
              type="button"
              onClick={() => onOpenMedia({ url, name: attachment.name, type: 'video', mimeType: attachment.mimeType })}
            >
              <video className="message-video" src={url} preload="metadata" muted playsInline />
              <span><VideoCameraIcon /> Ver vídeo</span>
            </button>
          );
        }
        if (attachment.type === 'audio') {
          return (
            <div className="message-file" key={attachment.url}>
              <MicrophoneIcon />
              <div>
                <strong>{attachment.name}</strong>
                <small>{formatFileSize(attachment.size)}</small>
                <audio controls src={url} />
              </div>
            </div>
          );
        }
        return (
          <a className="message-file" href={url} target="_blank" rel="noreferrer" key={attachment.url}>
            <DocumentIcon />
            <div>
              <strong>{attachment.name}</strong>
              <small>{formatFileSize(attachment.size)}</small>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function MessageReactions({
  currentUserId,
  members,
  message,
  modalEmoji,
  onCloseModal,
  onOpenModal,
  onReact,
  onRemoveOwnReaction,
}: {
  currentUserId?: string;
  members: ChatConversation['members'];
  message: ChatMessage;
  modalEmoji: string | null;
  onCloseModal: () => void;
  onOpenModal: (emoji: string) => void;
  onReact: (emoji: string) => void;
  onRemoveOwnReaction: (emoji: string) => void;
}) {
  const reactions = message.reactions ?? [];
  const total = reactions.reduce((sum, reaction) => sum + reaction.userIds.length, 0);
  const activeEmoji = modalEmoji === 'all' || reactions.some((reaction) => reaction.emoji === modalEmoji) ? modalEmoji : 'all';
  const memberName = (userId: string) => {
    if (userId === currentUserId) return 'Você';
    return members.find((member) => member.userId === userId)?.displayName ?? 'Usuário';
  };
  const rows = reactions.flatMap((reaction) => reaction.userIds.map((userId) => ({ emoji: reaction.emoji, userId })));
  const visibleRows = activeEmoji && activeEmoji !== 'all' ? rows.filter((row) => row.emoji === activeEmoji) : rows;

  return (
    <div className="message-reactions-wrap">
      <div className="message-reactions">
        {reactions.map((reaction) => {
          const reactedByMe = reaction.userIds.includes(currentUserId ?? '');
          return (
            <button
              key={reaction.emoji}
              className={`reaction-pill${reactedByMe ? ' reacted' : ''}`}
              onClick={() => reactedByMe ? onOpenModal(reaction.emoji) : onReact(reaction.emoji)}
              title={reactedByMe ? 'Ver reações' : `Reagir com ${reaction.emoji}`}
              type="button"
            >
              {reaction.emoji} <span>{reaction.userIds.length}</span>
            </button>
          );
        })}
      </div>
      {modalEmoji && (
        <>
          <button className="reaction-modal-backdrop" type="button" aria-label="Fechar reações" onClick={onCloseModal} />
          <div className="reaction-modal" role="dialog" aria-label="Reações da mensagem">
            <div className="reaction-modal-tabs">
              <button className={activeEmoji === 'all' ? 'active' : ''} type="button" onClick={() => onOpenModal('all')}>
                Todas ({total})
              </button>
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  className={activeEmoji === reaction.emoji ? 'active' : ''}
                  type="button"
                  onClick={() => onOpenModal(reaction.emoji)}
                >
                  {reaction.userIds.length} {reaction.emoji}
                </button>
              ))}
            </div>
            <div className="reaction-modal-list">
              {visibleRows.map((row) => {
                const own = row.userId === currentUserId;
                return (
                  <button
                    key={`${row.emoji}-${row.userId}`}
                    className={own ? 'own' : ''}
                    type="button"
                    onClick={() => {
                      if (own) {
                        onRemoveOwnReaction(row.emoji);
                        onCloseModal();
                      }
                    }}
                    disabled={!own}
                  >
                    <span className="reaction-user-avatar">{getInitials(memberName(row.userId))}</span>
                    <span className="reaction-user-info">
                      <strong>{memberName(row.userId)}</strong>
                      <small>{own ? 'Clique para remover' : 'Reagiu à mensagem'}</small>
                    </span>
                    <span className="reaction-user-emoji">{row.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessagePollCard({
  currentUserId,
  message,
  onDelete,
  onEdit,
  onVote,
}: {
  currentUserId: string | undefined;
  message: ChatMessage;
  onDelete: () => void;
  onEdit: () => void;
  onVote: (optionId: string) => void;
}) {
  if (!message.poll) return null;
  const totalVotes = message.poll.options.reduce((total, option) => total + option.voterIds.length, 0);
  const own = message.senderId === currentUserId;
  return (
    <div className="message-poll">
      <header>
        <strong>{message.poll.question}</strong>
        {own && (
          <span>
            <button type="button" onClick={onEdit}>Editar</button>
            <button type="button" onClick={onDelete}>Apagar</button>
          </span>
        )}
      </header>
      {message.poll.options.map((option) => {
        const voted = option.voterIds.includes(currentUserId ?? '');
        const percent = totalVotes ? Math.round((option.voterIds.length / totalVotes) * 100) : 0;
        return (
          <button type="button" className={`poll-option${voted ? ' voted' : ''}`} key={option.id} onClick={() => onVote(option.id)}>
            <span style={{ width: `${percent}%` }} />
            <strong>{option.text}</strong>
            <small>{option.voterIds.length}</small>
          </button>
        );
      })}
      <small>{totalVotes} voto{totalVotes === 1 ? '' : 's'} · {message.poll.allowMultiple ? 'múltipla escolha' : 'escolha única'}</small>
    </div>
  );
}

function PollModal({
  message,
  onClose,
  onSave,
}: {
  message: ChatMessage | null;
  onClose: () => void;
  onSave: (poll: { question: string; options: string[]; allowMultiple: boolean }) => void;
}) {
  const [question, setQuestion] = useState(message?.poll?.question ?? '');
  const [options, setOptions] = useState<string[]>(message?.poll?.options.map((option) => option.text) ?? ['', '']);
  const [allowMultiple, setAllowMultiple] = useState(Boolean(message?.poll?.allowMultiple));
  const validOptions = options.map((option) => option.trim()).filter(Boolean);
  const canSave = question.trim().length > 0 && validOptions.length >= 2;

  return (
    <div className="poll-modal-shell">
      <button className="modal-backdrop" type="button" aria-label="Fechar enquete" onClick={onClose} />
      <form className="poll-modal" onSubmit={(event) => { event.preventDefault(); if (canSave) onSave({ question: question.trim(), options: validOptions, allowMultiple }); }}>
        <h2>{message ? 'Editar enquete' : 'Nova enquete'}</h2>
        <label>Pergunta<input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={180} autoFocus /></label>
        <div className="poll-options-editor">
          {options.map((option, index) => (
            <label key={index}>
              Opção {index + 1}
              <input
                value={option}
                onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                maxLength={120}
              />
            </label>
          ))}
        </div>
        <div className="poll-editor-actions">
          <button type="button" onClick={() => setOptions((current) => [...current, ''])} disabled={options.length >= 8}>Adicionar opção</button>
          <label className="poll-check"><input type="checkbox" checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} /> Múltipla escolha</label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={!canSave}>{message ? 'Salvar' : 'Criar enquete'}</button>
        </footer>
      </form>
    </div>
  );
}

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

function MediaViewer({ media, onClose }: { media: SelectedMedia; onClose: () => void }) {
  return (
    <div className="media-viewer" role="dialog" aria-modal="true" aria-label={media.name}>
      <header>
        <button type="button" onClick={onClose} title="Fechar"><XMarkIcon /></button>
        <strong>{media.name}</strong>
      </header>
      <div className="media-viewer-stage" onClick={onClose}>
        {media.type === 'image' ? (
          <img src={media.url} alt={media.name} onClick={(event) => event.stopPropagation()} />
        ) : (
          <video src={media.url} controls autoPlay onClick={(event) => event.stopPropagation()}>
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  );
}

function ImagePreviewModal({
  activeImage,
  caption,
  emojiOpen,
  images,
  uploading,
  onCaptionChange,
  onClose,
  onEmojiSelect,
  onRemove,
  onRotate,
  onSelect,
  onSend,
  onToggleEmoji,
}: {
  activeImage: PendingImageItem | null;
  caption: string;
  emojiOpen: boolean;
  images: PendingImageItem[];
  uploading: boolean;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  onRemove: (id: string) => void;
  onRotate: () => void;
  onSelect: (id: string) => void;
  onSend: () => void;
  onToggleEmoji: () => void;
}) {
  return (
    <div className="image-preview-modal" role="dialog" aria-modal="true" aria-label="Prévia da imagem">
      <header className="image-preview-topbar">
        <button type="button" onClick={onClose} title="Fechar" disabled={uploading}><XMarkIcon /></button>
        <div className="image-preview-tools">
          <button type="button" onClick={onRotate} title="Girar imagem" disabled={uploading || !activeImage}><ArrowPathIcon /></button>
          <button type="button" onClick={() => activeImage && onRemove(activeImage.id)} title="Remover imagem" disabled={uploading || !activeImage}><TrashIcon /></button>
        </div>
      </header>

      <div className="image-preview-stage">
        {activeImage && (
          <img
            src={activeImage.previewUrl}
            alt={activeImage.file.name || 'Imagem selecionada'}
            style={{ transform: `rotate(${activeImage.rotation}deg)` }}
          />
        )}
      </div>

      <footer className="image-preview-footer">
        {images.length > 1 && (
          <div className="image-preview-thumbs" aria-label="Imagens selecionadas">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                className={image.id === activeImage?.id ? 'active' : ''}
                onClick={() => onSelect(image.id)}
                disabled={uploading}
              >
                <img src={image.previewUrl} alt={image.file.name || 'Miniatura'} />
              </button>
            ))}
          </div>
        )}
        <div className="image-caption-row">
          <button type="button" onClick={onToggleEmoji} title="Emoji" disabled={uploading}><FaceSmileIcon /></button>
          <input
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
            placeholder="Adicione uma legenda..."
            maxLength={1000}
            disabled={uploading}
            autoFocus
          />
          <button className="image-send-button" type="button" onClick={onSend} title="Enviar" disabled={uploading || images.length === 0}>
            <PaperAirplaneIcon />
          </button>
          {emojiOpen && (
            <div className="image-preview-emoji">
              <EmojiPickerDynamic
                onSelect={onEmojiSelect}
                height={320}
                searchPlaceholder="Buscar emoji..."
                storageKey="chatin_image_preview_emoji_recents"
              />
            </div>
          )}
        </div>
      </footer>
    </div>
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

function ClipModal({
  onAudio,
  onClose,
  onDocument,
  onImage,
  onPoll,
  onVideo,
}: {
  onAudio: () => void;
  onClose: () => void;
  onDocument: () => void;
  onImage: () => void;
  onPoll: () => void;
  onVideo: () => void;
}) {
  const options = [
    { label: 'Documento', desc: 'PDF, Word, Excel e mais', icon: <DocumentIcon />, onClick: onDocument },
    { label: 'Foto', desc: 'Imagem da galeria', icon: <PhotoIcon />, onClick: onImage },
    { label: 'Vídeo', desc: 'MP4, WebM, MOV e mais', icon: <VideoCameraIcon />, onClick: onVideo },
    { label: 'Áudio', desc: 'MP3, WAV, M4A e mais', icon: <MicrophoneIcon />, onClick: onAudio },
    { label: 'Enquete', desc: 'Crie uma votação no grupo', icon: <ChartBarIcon />, onClick: onPoll },
  ];
  return (
    <div className="clip-modal">
      <div className="clip-modal-header">
        <span>Anexar</span>
      </div>
      {options.map(opt => (
        <button key={opt.label} type="button" className="clip-modal-option" onClick={() => { opt.onClick(); onClose(); }}>
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

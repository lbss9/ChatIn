import { ChatMessageEntity } from '../entities/chat-message.entity';

export abstract class ChatMessagesRepository {
  abstract findRecent(conversationId: string, limit: number): Promise<ChatMessageEntity[]>;
  abstract findById(id: string): Promise<ChatMessageEntity | null>;
  abstract save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  abstract updateContent(id: string, content: string): Promise<ChatMessageEntity | null>;
  abstract markDeleted(id: string): Promise<ChatMessageEntity | null>;
  abstract toggleReaction(messageId: string, emoji: string, userId: string, action: 'add' | 'remove'): Promise<ChatMessageEntity | null>;
  abstract deleteByConversationId(conversationId: string): Promise<void>;
}

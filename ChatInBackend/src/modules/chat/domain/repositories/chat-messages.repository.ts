import { ChatMessageEntity, MessagePoll } from '../entities/chat-message.entity';

export abstract class ChatMessagesRepository {
  public abstract findRecent(conversationId: string, limit: number): Promise<ChatMessageEntity[]>;
  public abstract findById(id: string): Promise<ChatMessageEntity | null>;
  public abstract save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  public abstract updateContent(id: string, content: string): Promise<ChatMessageEntity | null>;
  public abstract markDeleted(id: string): Promise<ChatMessageEntity | null>;
  public abstract toggleReaction(messageId: string, emoji: string, userId: string, action: 'add' | 'remove'): Promise<ChatMessageEntity | null>;
  public abstract updatePoll(messageId: string, poll: MessagePoll): Promise<ChatMessageEntity | null>;
  public abstract deletePoll(messageId: string): Promise<ChatMessageEntity | null>;
  public abstract votePoll(messageId: string, optionId: string, userId: string): Promise<ChatMessageEntity | null>;
  public abstract deleteByConversationId(conversationId: string): Promise<void>;
}

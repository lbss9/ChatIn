import { ConversationEntity } from '../entities/conversation.entity';

export abstract class ConversationsRepository {
  public abstract findById(id: string): Promise<ConversationEntity | null>;
  public abstract findByIds(ids: string[]): Promise<ConversationEntity[]>;
  public abstract findGeneral(): Promise<ConversationEntity | null>;
  public abstract save(conversation: ConversationEntity): Promise<ConversationEntity>;
  public abstract deleteById(id: string): Promise<void>;
}

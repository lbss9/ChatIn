import { ConversationEntity } from '../entities/conversation.entity';

export abstract class ConversationsRepository {
  abstract findById(id: string): Promise<ConversationEntity | null>;
  abstract findByIds(ids: string[]): Promise<ConversationEntity[]>;
  abstract findGeneral(): Promise<ConversationEntity | null>;
  abstract save(conversation: ConversationEntity): Promise<ConversationEntity>;
  abstract deleteById(id: string): Promise<void>;
}

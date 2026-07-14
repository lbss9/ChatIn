import { ConversationMemberEntity } from '../entities/conversation-member.entity';

export abstract class ConversationMembersRepository {
  public abstract exists(conversationId: string, userId: string): Promise<boolean>;
  public abstract findByConversationId(conversationId: string): Promise<ConversationMemberEntity[]>;
  public abstract findByUserId(userId: string): Promise<ConversationMemberEntity[]>;
  public abstract findDirectBetween(firstUserId: string, secondUserId: string): Promise<ConversationMemberEntity[] | null>;
  public abstract findOne(conversationId: string, userId: string): Promise<ConversationMemberEntity | null>;
  public abstract save(member: ConversationMemberEntity): Promise<ConversationMemberEntity>;
  public abstract restoreByConversationId(conversationId: string): Promise<void>;
  public abstract patch(
    conversationId: string,
    userId: string,
    data: Partial<{
      pinnedAt: Date | null;
      mutedUntil: Date | null;
      lastReadAt: Date;
      deletedAt: Date | null;
    }>,
  ): Promise<ConversationMemberEntity | null>;
  public abstract deleteByConversationId(conversationId: string): Promise<void>;
}

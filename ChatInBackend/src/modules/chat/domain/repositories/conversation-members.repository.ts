import { ConversationMemberEntity } from '../entities/conversation-member.entity';

export abstract class ConversationMembersRepository {
  abstract exists(conversationId: string, userId: string): Promise<boolean>;
  abstract findByConversationId(conversationId: string): Promise<ConversationMemberEntity[]>;
  abstract findByUserId(userId: string): Promise<ConversationMemberEntity[]>;
  abstract findDirectBetween(firstUserId: string, secondUserId: string): Promise<ConversationMemberEntity[] | null>;
  abstract findOne(conversationId: string, userId: string): Promise<ConversationMemberEntity | null>;
  abstract save(member: ConversationMemberEntity): Promise<ConversationMemberEntity>;
  abstract patch(
    conversationId: string,
    userId: string,
    data: Partial<{ pinnedAt: Date | null; mutedUntil: Date | null; lastReadAt: Date; deletedAt: Date | null }>,
  ): Promise<ConversationMemberEntity | null>;
  abstract deleteByConversationId(conversationId: string): Promise<void>;
}

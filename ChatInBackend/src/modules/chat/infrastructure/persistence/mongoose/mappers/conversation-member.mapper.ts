import { ConversationMemberEntity } from '../../../../domain/entities/conversation-member.entity';
import { ConversationMemberDocument } from '../schemas/conversation-member.schema';

export class ConversationMemberMapper {
  public static toDomain(document: ConversationMemberDocument): ConversationMemberEntity {
    return new ConversationMemberEntity({
      id: document._id.toString(),
      conversationId: document.conversationId,
      userId: document.userId,
      displayName: document.displayName,
      role: document.role,
      joinedAt: document.joinedAt,
      pinnedAt: document.pinnedAt ?? null,
      mutedUntil: document.mutedUntil ?? null,
      lastReadAt: document.lastReadAt ?? null,
      deletedAt: document.deletedAt ?? null,
    });
  }

  public static toPersistence(entity: ConversationMemberEntity) {
    return {
      conversationId: entity.conversationId,
      userId: entity.userId,
      displayName: entity.displayName,
      role: entity.role,
      joinedAt: entity.joinedAt,
      pinnedAt: entity.pinnedAt ?? null,
      mutedUntil: entity.mutedUntil ?? null,
      lastReadAt: entity.lastReadAt ?? null,
      deletedAt: entity.deletedAt ?? null,
    };
  }
}

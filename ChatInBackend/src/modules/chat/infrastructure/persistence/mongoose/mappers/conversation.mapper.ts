import { ConversationEntity } from '../../../../domain/entities/conversation.entity';
import { ConversationDocument } from '../schemas/conversation.schema';

export class ConversationMapper {
  public static toDomain(document: ConversationDocument): ConversationEntity {
    return new ConversationEntity({
      id: document._id.toString(),
      title: document.title,
      type: document.type,
      createdById: document.createdById,
      lastMessagePreview: document.lastMessagePreview,
      lastMessageAt: document.lastMessageAt,
      createdAt: document.createdAt,
    });
  }

  public static toPersistence(entity: ConversationEntity) {
    return {
      title: entity.title,
      type: entity.type,
      createdById: entity.createdById,
      lastMessagePreview: entity.lastMessagePreview,
      lastMessageAt: entity.lastMessageAt,
      createdAt: entity.createdAt,
    };
  }
}

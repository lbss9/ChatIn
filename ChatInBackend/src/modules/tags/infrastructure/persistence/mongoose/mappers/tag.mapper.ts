import { TagEntity } from '../../../../domain/entities/tag.entity';
import { TagDocument } from '../schemas/tag.schema';

export class TagMapper {
  static toDomain(doc: TagDocument): TagEntity {
    return new TagEntity({
      id: doc._id.toString(),
      userId: doc.userId,
      name: doc.name,
      emoji: doc.emoji ?? null,
      color: doc.color ?? null,
      imageUrl: doc.imageUrl ?? null,
      conversationIds: doc.conversationIds ?? [],
      order: doc.order,
    });
  }

  static toPersistence(entity: TagEntity) {
    return {
      userId: entity.userId,
      name: entity.name,
      emoji: entity.emoji ?? null,
      color: entity.color ?? null,
      imageUrl: entity.imageUrl ?? null,
      conversationIds: entity.conversationIds,
      order: entity.order,
    };
  }

  static toResponse(entity: TagEntity) {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      emoji: entity.emoji,
      color: entity.color,
      imageUrl: entity.imageUrl,
      conversationIds: entity.conversationIds,
      order: entity.order,
    };
  }
}

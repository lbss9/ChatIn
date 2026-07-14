import { ChatMessageEntity } from '../../../../domain/entities/chat-message.entity';
import { ChatMessageDocument } from '../schemas/chat-message.schema';

export class ChatMessageMapper {
  public static toDomain(document: ChatMessageDocument): ChatMessageEntity {
    return new ChatMessageEntity({
      id: document._id.toString(),
      conversationId: document.conversationId,
      senderId: document.senderId,
      senderName: document.senderName,
      content: document.content,
      createdAt: document.createdAt,
      editedAt: document.editedAt ?? null,
      deletedAt: document.deletedAt ?? null,
      replyTo: document.replyTo
        ? {
            id: document.replyTo.id,
            senderName: document.replyTo.senderName,
            content: document.replyTo.content,
          }
        : null,
      reactions: (document.reactions ?? []).map((r) => ({
        emoji: r.emoji,
        userIds: [...r.userIds],
      })),
      attachments: (document.attachments ?? []).map((attachment) => ({
        type: attachment.type as 'image' | 'audio' | 'video' | 'document',
        url: attachment.url,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      })),
      poll: document.poll
        ? {
            question: document.poll.question,
            allowMultiple: document.poll.allowMultiple,
            closedAt: document.poll.closedAt ?? null,
            options: document.poll.options.map((option) => ({
              id: option.id,
              text: option.text,
              voterIds: [...option.voterIds],
            })),
          }
        : null,
    });
  }

  public static toPersistence(entity: ChatMessageEntity) {
    return {
      conversationId: entity.conversationId,
      senderId: entity.senderId,
      senderName: entity.senderName,
      content: entity.content,
      createdAt: entity.createdAt,
      replyTo: entity.replyTo ?? null,
      reactions: entity.reactions,
      attachments: entity.attachments,
      poll: entity.poll,
      editedAt: entity.editedAt ?? null,
      deletedAt: entity.deletedAt ?? null,
    };
  }

  public static toResponse(entity: ChatMessageEntity) {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      senderId: entity.senderId,
      senderName: entity.senderName,
      content: entity.content,
      createdAt: entity.createdAt.toISOString(),
      editedAt: entity.editedAt?.toISOString() ?? null,
      deletedAt: entity.deletedAt?.toISOString() ?? null,
      replyTo: entity.replyTo ?? null,
      reactions: entity.reactions,
      attachments: entity.attachments,
      poll: entity.poll
        ? {
            ...entity.poll,
            closedAt: entity.poll.closedAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}

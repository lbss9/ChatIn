import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessageEntity } from '../../../../domain/entities/chat-message.entity';
import { ChatMessagesRepository } from '../../../../domain/repositories/chat-messages.repository';
import { ChatMessageMapper } from '../mappers/chat-message.mapper';
import { ChatMessageDocument, ChatMessagePersistence } from '../schemas/chat-message.schema';

@Injectable()
export class MongooseChatMessagesRepository implements ChatMessagesRepository {
  constructor(@InjectModel(ChatMessagePersistence.name) private readonly model: Model<ChatMessageDocument>) {}

  async findRecent(conversationId: string, limit: number) {
    const documents = await this.model
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return documents.reverse().map(ChatMessageMapper.toDomain);
  }

  async findById(id: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  async save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    const document = await this.model.create(ChatMessageMapper.toPersistence(message));
    return ChatMessageMapper.toDomain(document);
  }

  async updateContent(id: string, content: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: { content, editedAt: new Date() } }, { new: true })
      .exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  async markDeleted(id: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: { deletedAt: new Date() } }, { new: true })
      .exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  async deleteByConversationId(conversationId: string) {
    await this.model.deleteMany({ conversationId }).exec();
  }

  async toggleReaction(messageId: string, emoji: string, userId: string, action: 'add' | 'remove'): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findById(messageId).exec();
    if (!doc) return null;

    const reactions = doc.reactions ?? [];
    const bucket = reactions.find(r => r.emoji === emoji);

    if (action === 'add') {
      if (bucket) {
        if (!bucket.userIds.includes(userId)) bucket.userIds.push(userId);
      } else {
        reactions.push({ emoji, userIds: [userId] });
      }
    } else {
      if (bucket) {
        bucket.userIds = bucket.userIds.filter(id => id !== userId);
      }
    }

    doc.reactions = reactions.filter(r => r.userIds.length > 0);
    doc.markModified('reactions');
    await doc.save();

    return ChatMessageMapper.toDomain(doc);
  }
}

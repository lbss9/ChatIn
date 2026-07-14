import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessageEntity, MessagePoll } from '../../../../domain/entities/chat-message.entity';
import { ChatMessagesRepository } from '../../../../domain/repositories/chat-messages.repository';
import { ChatMessageMapper } from '../mappers/chat-message.mapper';
import { ChatMessageDocument, ChatMessagePersistence } from '../schemas/chat-message.schema';

@Injectable()
export class MongooseChatMessagesRepository implements ChatMessagesRepository {
  public constructor(@InjectModel(ChatMessagePersistence.name) private readonly model: Model<ChatMessageDocument>) {}

  public async findRecent(conversationId: string, limit: number) {
    const documents = await this.model.find({ conversationId }).sort({ createdAt: -1 }).limit(limit).exec();
    return documents.reverse().map(ChatMessageMapper.toDomain);
  }

  public async findById(id: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  public async save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    const document = await this.model.create(ChatMessageMapper.toPersistence(message));
    return ChatMessageMapper.toDomain(document);
  }

  public async updateContent(id: string, content: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findByIdAndUpdate(id, { $set: { content, editedAt: new Date() } }, { new: true }).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  public async markDeleted(id: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } }, { new: true }).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  public async deleteByConversationId(conversationId: string) {
    await this.model.deleteMany({ conversationId }).exec();
  }

  public async updatePoll(messageId: string, poll: MessagePoll): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findByIdAndUpdate(messageId, { $set: { poll, editedAt: new Date() } }, { new: true }).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  public async deletePoll(messageId: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findByIdAndUpdate(messageId, { $set: { poll: null, editedAt: new Date() } }, { new: true }).exec();
    return doc ? ChatMessageMapper.toDomain(doc) : null;
  }

  public async votePoll(messageId: string, optionId: string, userId: string): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findById(messageId).exec();
    if (!doc?.poll || doc.poll.closedAt) return doc ? ChatMessageMapper.toDomain(doc) : null;

    const option = doc.poll.options.find((item) => item.id === optionId);
    if (!option) return ChatMessageMapper.toDomain(doc);

    if (!doc.poll.allowMultiple) {
      doc.poll.options.forEach((item) => {
        item.voterIds = item.voterIds.filter((id) => id !== userId);
      });
    }

    if (option.voterIds.includes(userId)) {
      option.voterIds = option.voterIds.filter((id) => id !== userId);
    } else {
      option.voterIds.push(userId);
    }

    doc.markModified('poll');
    await doc.save();

    return ChatMessageMapper.toDomain(doc);
  }

  public async toggleReaction(messageId: string, emoji: string, userId: string, action: 'add' | 'remove'): Promise<ChatMessageEntity | null> {
    const doc = await this.model.findById(messageId).exec();
    if (!doc) return null;

    const reactions = doc.reactions ?? [];
    const bucket = reactions.find((r) => r.emoji === emoji);

    if (action === 'add') {
      reactions.forEach((reaction) => {
        reaction.userIds = reaction.userIds.filter((id) => id !== userId);
      });
      if (bucket) {
        bucket.userIds.push(userId);
      } else {
        reactions.push({ emoji, userIds: [userId] });
      }
    } else {
      if (bucket) {
        bucket.userIds = bucket.userIds.filter((id) => id !== userId);
      }
    }

    doc.reactions = reactions.filter((r) => r.userIds.length > 0);
    doc.markModified('reactions');
    await doc.save();

    return ChatMessageMapper.toDomain(doc);
  }
}

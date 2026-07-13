import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationMemberEntity } from '../../../../domain/entities/conversation-member.entity';
import { ConversationMembersRepository } from '../../../../domain/repositories/conversation-members.repository';
import { ConversationMemberMapper } from '../mappers/conversation-member.mapper';
import { ConversationMemberDocument, ConversationMemberPersistence } from '../schemas/conversation-member.schema';

@Injectable()
export class MongooseConversationMembersRepository implements ConversationMembersRepository {
  constructor(@InjectModel(ConversationMemberPersistence.name) private readonly model: Model<ConversationMemberDocument>) {}

  async exists(conversationId: string, userId: string) {
    return Boolean(await this.model.exists({ conversationId, userId, deletedAt: null }));
  }

  async findByConversationId(conversationId: string) {
    const documents = await this.model.find({ conversationId, deletedAt: null }).sort({ role: 1, joinedAt: 1 }).exec();
    return documents.map(ConversationMemberMapper.toDomain);
  }

  async findByUserId(userId: string) {
    const documents = await this.model.find({ userId, deletedAt: null }).sort({ joinedAt: 1 }).exec();
    return documents.map(ConversationMemberMapper.toDomain);
  }

  async findDirectBetween(firstUserId: string, secondUserId: string) {
    const firstMemberships = await this.model.find({ userId: firstUserId, deletedAt: null }).exec();
    if (!firstMemberships.length) return null;

    const conversationIds = firstMemberships.map((membership) => membership.conversationId);
    const secondMemberships = await this.model.find({ userId: secondUserId, conversationId: { $in: conversationIds }, deletedAt: null }).exec();

    for (const membership of secondMemberships) {
      const members = await this.model.find({ conversationId: membership.conversationId, deletedAt: null }).exec();
      if (members.length === 2) return members.map(ConversationMemberMapper.toDomain);
    }

    return null;
  }

  async findOne(conversationId: string, userId: string) {
    const doc = await this.model.findOne({ conversationId, userId }).exec();
    return doc ? ConversationMemberMapper.toDomain(doc) : null;
  }

  async save(member: ConversationMemberEntity) {
    const document = await this.model.findOneAndUpdate(
      { conversationId: member.conversationId, userId: member.userId },
      ConversationMemberMapper.toPersistence(member),
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
    if (!document) throw new Error('Conversation member persistence failed.');
    return ConversationMemberMapper.toDomain(document);
  }

  async patch(
    conversationId: string,
    userId: string,
    data: Partial<{ pinnedAt: Date | null; mutedUntil: Date | null; lastReadAt: Date; deletedAt: Date | null }>,
  ) {
    const doc = await this.model
      .findOneAndUpdate({ conversationId, userId }, { $set: data }, { returnDocument: 'after' })
      .exec();
    return doc ? ConversationMemberMapper.toDomain(doc) : null;
  }

  async deleteByConversationId(conversationId: string) {
    await this.model.deleteMany({ conversationId }).exec();
  }
}

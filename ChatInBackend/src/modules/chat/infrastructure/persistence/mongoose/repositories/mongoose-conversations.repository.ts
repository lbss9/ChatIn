import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationEntity } from '../../../../domain/entities/conversation.entity';
import { ConversationsRepository } from '../../../../domain/repositories/conversations.repository';
import { ConversationMapper } from '../mappers/conversation.mapper';
import { ConversationDocument, ConversationPersistence } from '../schemas/conversation.schema';

@Injectable()
export class MongooseConversationsRepository implements ConversationsRepository {
  constructor(@InjectModel(ConversationPersistence.name) private readonly model: Model<ConversationDocument>) {}

  async findById(id: string) {
    const document = await this.model.findById(id);
    return document ? ConversationMapper.toDomain(document) : null;
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    const documents = await this.model.find({ _id: { $in: ids } }).sort({ lastMessageAt: -1, createdAt: -1 }).exec();
    return documents.map(ConversationMapper.toDomain);
  }

  async findGeneral() {
    const document = await this.model.findOne({ type: 'group', title: 'ChatIn geral' });
    return document ? ConversationMapper.toDomain(document) : null;
  }

  async save(conversation: ConversationEntity) {
    const data = ConversationMapper.toPersistence(conversation);
    const document = conversation.id
      ? await this.model.findByIdAndUpdate(conversation.id, data, { returnDocument: 'after', runValidators: true })
      : await this.model.create(data);
    if (!document) throw new Error('Conversation persistence failed.');
    return ConversationMapper.toDomain(document);
  }

  async deleteById(id: string) {
    await this.model.findByIdAndDelete(id).exec();
  }
}

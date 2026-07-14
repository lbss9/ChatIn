import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TagEntity } from '../../../../domain/entities/tag.entity';
import { TagsRepository } from '../../../../domain/repositories/tags.repository';
import { TagMapper } from '../mappers/tag.mapper';
import { TagDocument, TagPersistence } from '../schemas/tag.schema';

@Injectable()
export class MongooseTagsRepository implements TagsRepository {
  public constructor(@InjectModel(TagPersistence.name) private readonly model: Model<TagDocument>) {}

  public async create(tag: TagEntity): Promise<TagEntity> {
    const doc = await this.model.create(TagMapper.toPersistence(tag));
    return TagMapper.toDomain(doc);
  }

  public async findAllByUserId(userId: string): Promise<TagEntity[]> {
    const docs = await this.model.find({ userId }).sort({ order: 1, createdAt: 1 }).exec();
    return docs.map(TagMapper.toDomain);
  }

  public async findById(id: string): Promise<TagEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? TagMapper.toDomain(doc) : null;
  }

  public async update(tag: TagEntity): Promise<TagEntity> {
    const doc = await this.model.findByIdAndUpdate(tag.id, { $set: TagMapper.toPersistence(tag) }, { new: true }).exec();
    if (!doc) throw new Error(`Tag ${tag.id} not found during update.`);
    return TagMapper.toDomain(doc);
  }

  public async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}

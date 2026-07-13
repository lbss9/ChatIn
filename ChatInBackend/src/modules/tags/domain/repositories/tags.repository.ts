import { TagEntity } from '../entities/tag.entity';

export abstract class TagsRepository {
  abstract create(tag: TagEntity): Promise<TagEntity>;
  abstract findAllByUserId(userId: string): Promise<TagEntity[]>;
  abstract findById(id: string): Promise<TagEntity | null>;
  abstract update(tag: TagEntity): Promise<TagEntity>;
  abstract delete(id: string): Promise<void>;
}

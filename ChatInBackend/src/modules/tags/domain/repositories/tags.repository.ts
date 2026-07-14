import { TagEntity } from '../entities/tag.entity';

export abstract class TagsRepository {
  public abstract create(tag: TagEntity): Promise<TagEntity>;
  public abstract findAllByUserId(userId: string): Promise<TagEntity[]>;
  public abstract findById(id: string): Promise<TagEntity | null>;
  public abstract update(tag: TagEntity): Promise<TagEntity>;
  public abstract delete(id: string): Promise<void>;
}

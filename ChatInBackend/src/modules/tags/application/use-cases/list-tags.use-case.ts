import { TagEntity } from '../../domain/entities/tag.entity';
import { TagsRepository } from '../../domain/repositories/tags.repository';

export type ListTagsInput = {
  userId: string;
};

export class ListTagsUseCase {
  public constructor(private readonly tags: TagsRepository) {}

  public async execute(input: ListTagsInput): Promise<TagEntity[]> {
    return this.tags.findAllByUserId(input.userId);
  }
}

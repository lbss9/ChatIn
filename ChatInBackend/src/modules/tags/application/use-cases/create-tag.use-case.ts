import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { TagEntity } from '../../domain/entities/tag.entity';
import { TagsRepository } from '../../domain/repositories/tags.repository';

export type CreateTagInput = {
  userId: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  conversationIds?: string[];
};

export class CreateTagUseCase {
  public constructor(private readonly tags: TagsRepository) {}

  public async execute(input: CreateTagInput): Promise<TagEntity> {
    const name = input.name?.trim();
    if (!name) throw new ApplicationError('INVALID', 'O nome da marcação não pode ser vazio.');

    const existing = await this.tags.findAllByUserId(input.userId);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) + 1 : 0;

    const tag = new TagEntity({
      userId: input.userId,
      name,
      emoji: input.emoji ?? null,
      color: input.color ?? null,
      imageUrl: input.imageUrl ?? null,
      conversationIds: input.conversationIds ?? [],
      order: maxOrder,
    });

    return this.tags.create(tag);
  }
}

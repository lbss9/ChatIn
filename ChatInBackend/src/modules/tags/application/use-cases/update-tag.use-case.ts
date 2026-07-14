import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { TagEntity } from '../../domain/entities/tag.entity';
import { TagsRepository } from '../../domain/repositories/tags.repository';

export type UpdateTagInput = {
  tagId: string;
  userId: string;
  name?: string;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  conversationIds?: string[];
  order?: number;
};

export class UpdateTagUseCase {
  public constructor(private readonly tags: TagsRepository) {}

  public async execute(input: UpdateTagInput): Promise<TagEntity> {
    const existing = await this.tags.findById(input.tagId);
    if (!existing) throw new ApplicationError('NOT_FOUND', 'Marcação não encontrada.');
    if (existing.userId !== input.userId) throw new ApplicationError('FORBIDDEN', 'Sem permissão para editar esta marcação.');

    const updated = new TagEntity({
      id: existing.id,
      userId: existing.userId,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      emoji: input.emoji !== undefined ? input.emoji : existing.emoji,
      color: input.color !== undefined ? input.color : existing.color,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
      conversationIds: input.conversationIds !== undefined ? input.conversationIds : existing.conversationIds,
      order: input.order !== undefined ? input.order : existing.order,
    });

    return this.tags.update(updated);
  }
}

import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { FileStoragePort } from '../../../../shared/infrastructure/storage/file-storage.port';
import { TagsRepository } from '../../domain/repositories/tags.repository';

export type DeleteTagInput = {
  tagId: string;
  userId: string;
};

export class DeleteTagUseCase {
  public constructor(
    private readonly tags: TagsRepository,
    private readonly fileStorage: FileStoragePort,
  ) {}

  public async execute(input: DeleteTagInput): Promise<void> {
    const existing = await this.tags.findById(input.tagId);
    if (!existing) throw new ApplicationError('NOT_FOUND', 'Marcação não encontrada.');
    if (existing.userId !== input.userId) throw new ApplicationError('FORBIDDEN', 'Sem permissão para excluir esta marcação.');

    await this.tags.delete(input.tagId);

    if (existing.imageUrl) {
      await this.fileStorage.delete(existing.imageUrl);
    }
  }
}

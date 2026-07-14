import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { FileStoragePort } from '../../shared/infrastructure/storage/file-storage.port';
import { CreateTagUseCase } from './application/use-cases/create-tag.use-case';
import { DeleteTagUseCase } from './application/use-cases/delete-tag.use-case';
import { ListTagsUseCase } from './application/use-cases/list-tags.use-case';
import { UpdateTagUseCase } from './application/use-cases/update-tag.use-case';
import { TagsRepository } from './domain/repositories/tags.repository';
import { MongooseTagsRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-tags.repository';
import { TagPersistence, TagSchema } from './infrastructure/persistence/mongoose/schemas/tag.schema';
import { TagsController } from './presentation/controllers/tags.controller';

@Module({
  imports: [AuthModule, UploadsModule, MongooseModule.forFeature([{ name: TagPersistence.name, schema: TagSchema }])],
  controllers: [TagsController],
  providers: [
    { provide: TagsRepository, useClass: MongooseTagsRepository },
    {
      provide: CreateTagUseCase,
      useFactory: (tags: TagsRepository) => new CreateTagUseCase(tags),
      inject: [TagsRepository],
    },
    {
      provide: ListTagsUseCase,
      useFactory: (tags: TagsRepository) => new ListTagsUseCase(tags),
      inject: [TagsRepository],
    },
    {
      provide: UpdateTagUseCase,
      useFactory: (tags: TagsRepository) => new UpdateTagUseCase(tags),
      inject: [TagsRepository],
    },
    {
      provide: DeleteTagUseCase,
      useFactory: (tags: TagsRepository, fileStorage: FileStoragePort) => new DeleteTagUseCase(tags, fileStorage),
      inject: [TagsRepository, FileStoragePort],
    },
  ],
})
export class TagsModule {}

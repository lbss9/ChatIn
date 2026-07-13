import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../../auth/infrastructure/http/access-token.guard';
import { CurrentUser } from '../../../auth/infrastructure/http/current-user.decorator';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { CreateTagUseCase } from '../../application/use-cases/create-tag.use-case';
import { DeleteTagUseCase } from '../../application/use-cases/delete-tag.use-case';
import { ListTagsUseCase } from '../../application/use-cases/list-tags.use-case';
import { UpdateTagUseCase } from '../../application/use-cases/update-tag.use-case';
import { TagMapper } from '../../infrastructure/persistence/mongoose/mappers/tag.mapper';
import { CreateTagDto, UpdateTagDto } from '../dto/tag.dto';

@Controller('tags')
@UseGuards(AccessTokenGuard)
export class TagsController {
  constructor(
    private readonly listTags: ListTagsUseCase,
    private readonly createTag: CreateTagUseCase,
    private readonly updateTag: UpdateTagUseCase,
    private readonly deleteTag: DeleteTagUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: UserEntity) {
    const tags = await this.listTags.execute({ userId: user.id! });
    return tags.map(TagMapper.toResponse);
  }

  @Post()
  async create(@CurrentUser() user: UserEntity, @Body() dto: CreateTagDto) {
    const tag = await this.createTag.execute({
      userId: user.id!,
      name: dto.name,
      emoji: dto.emoji,
      color: dto.color,
      imageUrl: dto.imageUrl,
      conversationIds: dto.conversationIds,
    });
    return TagMapper.toResponse(tag);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    const tag = await this.updateTag.execute({
      tagId: id,
      userId: user.id!,
      name: dto.name,
      emoji: dto.emoji,
      color: dto.color,
      imageUrl: dto.imageUrl,
      conversationIds: dto.conversationIds,
      order: dto.order,
    });
    return TagMapper.toResponse(tag);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    await this.deleteTag.execute({ tagId: id, userId: user.id! });
    return { success: true };
  }
}

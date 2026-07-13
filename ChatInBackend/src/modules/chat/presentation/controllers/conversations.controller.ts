import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { AccessTokenGuard } from '../../../auth/infrastructure/http/access-token.guard';
import { CurrentUser } from '../../../auth/infrastructure/http/current-user.decorator';
import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';
import { CreateGroupConversationUseCase } from '../../application/use-cases/create-group-conversation.use-case';
import { ListConversationsUseCase } from '../../application/use-cases/list-conversations.use-case';
import { OpenDirectConversationUseCase } from '../../application/use-cases/open-direct-conversation.use-case';
import { AddContactByEmailDto, CreateGroupConversationDto, OpenDirectConversationDto } from '../dto/conversation.dto';

@Controller('conversations')
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(
    private readonly listConversations: ListConversationsUseCase,
    private readonly createGroupConversation: CreateGroupConversationUseCase,
    private readonly openDirectConversation: OpenDirectConversationUseCase,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(ConversationMembersRepository) private readonly membersRepo: ConversationMembersRepository,
    @Inject(ChatMessagesRepository) private readonly chatMessagesRepo: ChatMessagesRepository,
    @Inject(ConversationsRepository) private readonly conversationsRepo: ConversationsRepository,
  ) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.listConversations.execute(user);
  }

  @Post('groups')
  createGroup(@CurrentUser() user: UserEntity, @Body() dto: CreateGroupConversationDto) {
    return this.createGroupConversation.execute(user, dto.title);
  }

  @Post('direct')
  openDirect(@CurrentUser() user: UserEntity, @Body() dto: OpenDirectConversationDto) {
    return this.openDirectConversation.execute(user, dto.targetUserId);
  }

  @Post('contacts')
  async addContact(@CurrentUser() user: UserEntity, @Body() dto: AddContactByEmailDto) {
    const contact = await this.users.findByEmail(dto.email.trim().toLowerCase());
    if (!contact?.id || contact.id === user.id) throw new NotFoundException('Não foi possível adicionar este contato.');
    return this.openDirectConversation.execute(user, contact.id);
  }

  @Patch(':id/pin')
  async pin(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    const member = await this.membersRepo.findOne(id, user.id!);
    if (!member || member.deletedAt) throw new NotFoundException('Conversa não encontrada.');
    const pinnedAt = member.pinnedAt ? null : new Date();
    const updated = await this.membersRepo.patch(id, user.id!, { pinnedAt });
    return { pinnedAt: updated?.pinnedAt?.toISOString() ?? null };
  }

  @Patch(':id/mute')
  async mute(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    const member = await this.membersRepo.findOne(id, user.id!);
    if (!member || member.deletedAt) throw new NotFoundException('Conversa não encontrada.');
    const mutedUntil = member.mutedUntil ? null : new Date('2099-12-31');
    const updated = await this.membersRepo.patch(id, user.id!, { mutedUntil });
    return { mutedUntil: updated?.mutedUntil?.toISOString() ?? null };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    const isMember = await this.membersRepo.exists(id, user.id!);
    if (!isMember) throw new NotFoundException('Conversa não encontrada.');
    const readAt = new Date();
    await this.membersRepo.patch(id, user.id!, { lastReadAt: readAt });
    return { lastReadAt: readAt.toISOString() };
  }

  @Delete(':id')
  async deleteConversation(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { deleteForAll?: boolean },
  ) {
    const isMember = await this.membersRepo.exists(id, user.id!);
    if (!isMember) throw new NotFoundException('Conversa não encontrada.');

    if (body?.deleteForAll) {
      await this.chatMessagesRepo.deleteByConversationId(id);
      await this.membersRepo.deleteByConversationId(id);
      await this.conversationsRepo.deleteById(id);
    } else {
      await this.membersRepo.patch(id, user.id!, { deletedAt: new Date() });
    }

    return { success: true };
  }
}

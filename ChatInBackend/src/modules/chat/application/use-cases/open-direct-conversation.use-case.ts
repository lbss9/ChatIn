import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationMemberEntity } from '../../domain/entities/conversation-member.entity';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';
import { ConversationSummary, ListConversationsUseCase } from './list-conversations.use-case';

export class OpenDirectConversationUseCase {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly members: ConversationMembersRepository,
    private readonly users: UsersRepository,
    private readonly listConversations: ListConversationsUseCase,
  ) {}

  async execute(user: UserEntity, targetUserId: string): Promise<ConversationSummary> {
    if (user.id === targetUserId) throw new ApplicationError('INVALID_DIRECT_CONVERSATION', 'Você não pode abrir conversa direta consigo mesmo.');

    const targetUser = await this.users.findById(targetUserId);
    if (!targetUser?.id) throw new ApplicationError('SENDER_NOT_FOUND', 'Usuário não encontrado.');

    const existingMembers = await this.members.findDirectBetween(user.id!, targetUser.id);
    if (existingMembers?.length) {
      const [summary] = (await this.listConversations.execute(user)).filter((item) => item.id === existingMembers[0].conversationId);
      return summary;
    }

    const conversation = await this.conversations.save(new ConversationEntity({
      title: `${user.name}, ${targetUser.name}`,
      type: 'direct',
      createdById: user.id!,
    }));

    await Promise.all([
      this.members.save(new ConversationMemberEntity({ conversationId: conversation.id!, userId: user.id!, displayName: user.name })),
      this.members.save(new ConversationMemberEntity({ conversationId: conversation.id!, userId: targetUser.id, displayName: targetUser.name })),
    ]);

    const [summary] = (await this.listConversations.execute(user)).filter((item) => item.id === conversation.id);
    return summary;
  }
}

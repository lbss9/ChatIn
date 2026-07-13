import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationMemberEntity } from '../../domain/entities/conversation-member.entity';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';
import { ConversationSummary, ListConversationsUseCase } from './list-conversations.use-case';

export class CreateGroupConversationUseCase {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly members: ConversationMembersRepository,
    private readonly listConversations: ListConversationsUseCase,
  ) {}

  async execute(user: UserEntity, title: string): Promise<ConversationSummary> {
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 2) throw new ApplicationError('INVALID_CONVERSATION_TITLE', 'Informe um nome para a conversa.');
    if (normalizedTitle.length > 80) throw new ApplicationError('INVALID_CONVERSATION_TITLE', 'O nome da conversa deve ter no máximo 80 caracteres.');

    const conversation = await this.conversations.save(new ConversationEntity({
      title: normalizedTitle,
      type: 'group',
      createdById: user.id!,
    }));

    await this.members.save(new ConversationMemberEntity({
      conversationId: conversation.id!,
      userId: user.id!,
      displayName: user.name,
      role: 'admin',
    }));

    const [summary] = (await this.listConversations.execute(user)).filter((item) => item.id === conversation.id);
    return summary;
  }
}

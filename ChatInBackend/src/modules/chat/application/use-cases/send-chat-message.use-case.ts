import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { ChatMessageEntity } from '../../domain/entities/chat-message.entity';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';
import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';

export type SendChatMessageInput = {
  conversationId: string;
  senderId: string;
  content: string;
  replyTo?: { id: string; senderName: string; content: string } | null;
};

export class SendChatMessageUseCase {
  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly users: UsersRepository,
    private readonly conversations: ConversationsRepository,
    private readonly members: ConversationMembersRepository,
  ) {}

  async execute(input: SendChatMessageInput) {
    const content = input.content.trim();
    if (!content) throw new ApplicationError('EMPTY_MESSAGE', 'A mensagem não pode ficar vazia.');
    if (content.length > 1_000) throw new ApplicationError('MESSAGE_TOO_LONG', 'A mensagem deve ter no máximo 1000 caracteres.');

    const sender = await this.users.findById(input.senderId);
    if (!sender) throw new ApplicationError('SENDER_NOT_FOUND', 'Usuário não encontrado.');
    if (!await this.members.exists(input.conversationId, sender.id!)) {
      throw new ApplicationError('NOT_CONVERSATION_MEMBER', 'Você não faz parte dessa conversa.');
    }

    const message = await this.messages.save(new ChatMessageEntity({
      conversationId: input.conversationId,
      senderId: sender.id!,
      senderName: sender.name,
      content,
      replyTo: input.replyTo ?? null,
    }));

    const conversation = await this.conversations.findById(input.conversationId);
    if (conversation) {
      conversation.markLastMessage(content, message.createdAt);
      await this.conversations.save(conversation);
    }

    return message;
  }
}

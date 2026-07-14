import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { ChatMessageEntity, MessageAttachment, MessagePoll } from '../../domain/entities/chat-message.entity';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';
import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';

export type SendChatMessageInput = {
  conversationId: string;
  senderId: string;
  content: string;
  replyTo?: { id: string; senderName: string; content: string } | null;
  attachments?: MessageAttachment[];
  poll?: MessagePoll | null;
};

export class SendChatMessageUseCase {
  public constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly users: UsersRepository,
    private readonly conversations: ConversationsRepository,
    private readonly members: ConversationMembersRepository,
  ) {}

  public async execute(input: SendChatMessageInput) {
    const content = input.content.trim();
    const hasAttachments = (input.attachments?.length ?? 0) > 0;
    const hasPoll = Boolean(input.poll);
    if (!content && !hasAttachments && !hasPoll) throw new ApplicationError('EMPTY_MESSAGE', 'A mensagem não pode ficar vazia.');
    if (content.length > 1_000) throw new ApplicationError('MESSAGE_TOO_LONG', 'A mensagem deve ter no máximo 1000 caracteres.');

    const sender = await this.users.findById(input.senderId);
    if (!sender) throw new ApplicationError('SENDER_NOT_FOUND', 'Usuário não encontrado.');
    if (!(await this.members.exists(input.conversationId, sender.id!))) {
      throw new ApplicationError('NOT_CONVERSATION_MEMBER', 'Você não faz parte dessa conversa.');
    }

    const message = await this.messages.save(
      new ChatMessageEntity({
        conversationId: input.conversationId,
        senderId: sender.id!,
        senderName: sender.name,
        content,
        replyTo: input.replyTo ?? null,
        attachments: input.attachments ?? [],
        poll: input.poll ?? null,
      }),
    );

    const conversation = await this.conversations.findById(input.conversationId);
    if (conversation) {
      const preview = content || (hasPoll ? 'Enquete' : this.attachmentPreview(input.attachments?.[0]?.type));
      conversation.markLastMessage(preview, message.createdAt);
      await this.conversations.save(conversation);
      await this.members.restoreByConversationId(conversation.id!);
    }

    return message;
  }

  private attachmentPreview(type?: MessageAttachment['type']) {
    if (type === 'image') return 'Foto';
    if (type === 'audio') return 'Áudio';
    if (type === 'video') return 'Vídeo';
    if (type === 'document') return 'Documento';
    return 'Anexo';
  }
}

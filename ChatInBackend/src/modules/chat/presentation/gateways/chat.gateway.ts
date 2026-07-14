import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { TokenService } from '../../../auth/application/ports/token-service.port';
import { readAccessCookie } from '../../../auth/infrastructure/http/auth-cookie.utils';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { ListChatHistoryUseCase } from '../../application/use-cases/list-chat-history.use-case';
import { SendChatMessageUseCase } from '../../application/use-cases/send-chat-message.use-case';
import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ChatMessageMapper } from '../../infrastructure/persistence/mongoose/mappers/chat-message.mapper';
import { ChatMessageEntity, MessageAttachment, MessagePoll } from '../../domain/entities/chat-message.entity';

type AuthenticatedSocket = Socket & {
  data: {
    user?: { id: string; name: string; email: string };
  };
};

type IncomingAttachment = {
  type?: string;
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

type IncomingPollOption = { id?: string; text?: string; voterIds?: string[] };

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  public constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(ListChatHistoryUseCase) private readonly listHistory: ListChatHistoryUseCase,
    @Inject(SendChatMessageUseCase) private readonly sendMessage: SendChatMessageUseCase,
    @Inject(ConversationMembersRepository) private readonly members: ConversationMembersRepository,
    @Inject(ChatMessagesRepository) private readonly chatMessages: ChatMessagesRepository,
  ) {}

  public async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.tokens.verifyAccessToken(token);
      const user = await this.users.findById(payload.sub);
      if (!user?.id) throw new Error('User not found.');

      client.data.user = { id: user.id, name: user.name, email: user.email };
      await client.join(this.userRoom(user.id));
      client.emit('chat:connected', { socketId: client.id, user: client.data.user });
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Chat socket authentication failed.');
      client.emit('chat:error', { message: 'Sessão inválida. Entre novamente.' });
      client.disconnect(true);
    }
  }

  public handleDisconnect(_client: AuthenticatedSocket) {
    return;
  }

  @SubscribeMessage('chat:join')
  public async handleJoin(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      const conversationId = this.resolveId(body?.conversationId);
      if (!(await this.members.exists(conversationId, client.data.user.id))) {
        throw new ApplicationError('NOT_CONVERSATION_MEMBER', 'Você não faz parte dessa conversa.');
      }

      await client.join(conversationId);
      const readAt = new Date();
      await this.members.patch(conversationId, client.data.user.id, { lastReadAt: readAt });
      await this.emitToConversationMembers(conversationId, 'chat:read-receipt', {
        conversationId,
        userId: client.data.user.id,
        readAt: readAt.toISOString(),
      });

      const messages = await this.listHistory.execute(conversationId);
      client.emit('chat:history', {
        conversationId,
        messages: messages.map(ChatMessageMapper.toResponse),
      });

      return { event: 'chat:joined', data: { conversationId } };
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível entrar na conversa.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:message')
  public async handleMessage(
    @MessageBody()
    body: {
      conversationId?: string;
      content?: string;
      replyToId?: string | null;
      attachments?: IncomingAttachment[];
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');

      const conversationId = this.resolveId(body?.conversationId);

      let replyTo: { id: string; senderName: string; content: string } | null = null;
      if (body?.replyToId) {
        const referenced = await this.chatMessages.findById(body.replyToId);
        if (referenced && !referenced.deletedAt) {
          replyTo = {
            id: referenced.id!,
            senderName: referenced.senderName,
            content: referenced.content,
          };
        }
      }

      const message = await this.sendMessage.execute({
        conversationId,
        senderId: client.data.user.id,
        content: body?.content ?? '',
        replyTo,
        attachments: this.normalizeAttachments(body?.attachments ?? []),
      });

      const response = ChatMessageMapper.toResponse(message);
      await this.emitToConversationMembers(conversationId, 'chat:message', response);
      return { event: 'chat:message:sent', data: response };
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível enviar a mensagem.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:poll-create')
  public async handleCreatePoll(
    @MessageBody() body: { conversationId?: string; question?: string; options?: IncomingPollOption[]; allowMultiple?: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      const conversationId = this.resolveId(body?.conversationId);
      const poll = this.normalizePoll(body?.question, body?.options, Boolean(body?.allowMultiple));
      const message = await this.sendMessage.execute({
        conversationId,
        senderId: client.data.user.id,
        content: '',
        poll,
      });
      const response = ChatMessageMapper.toResponse(message);
      await this.emitToConversationMembers(conversationId, 'chat:message', response);
      return { event: 'chat:poll:created', data: response };
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível criar a enquete.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:poll-update')
  public async handleUpdatePoll(
    @MessageBody() body: { messageId?: string; question?: string; options?: IncomingPollOption[]; allowMultiple?: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      if (!body?.messageId) throw new ApplicationError('INVALID', 'ID de mensagem inválido.');
      const message = await this.chatMessages.findById(body.messageId);
      if (!message?.poll) throw new ApplicationError('NOT_FOUND', 'Enquete não encontrada.');
      if (message.senderId !== client.data.user.id) throw new ApplicationError('FORBIDDEN', 'Você não pode editar essa enquete.');
      const poll = this.normalizePoll(body.question, body.options, Boolean(body.allowMultiple));
      const updated = await this.chatMessages.updatePoll(body.messageId, poll);
      if (!updated) throw new ApplicationError('NOT_FOUND', 'Enquete não encontrada.');
      await this.emitMessageUpdated(updated);
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível editar a enquete.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:poll-delete')
  public async handleDeletePoll(@MessageBody() body: { messageId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      if (!body?.messageId) throw new ApplicationError('INVALID', 'ID de mensagem inválido.');
      const message = await this.chatMessages.findById(body.messageId);
      if (!message?.poll) throw new ApplicationError('NOT_FOUND', 'Enquete não encontrada.');
      if (message.senderId !== client.data.user.id) throw new ApplicationError('FORBIDDEN', 'Você não pode apagar essa enquete.');
      const updated = await this.chatMessages.markDeleted(body.messageId);
      if (!updated) throw new ApplicationError('NOT_FOUND', 'Enquete não encontrada.');
      await this.emitMessageUpdated(updated);
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível apagar a enquete.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:poll-vote')
  public async handleVotePoll(@MessageBody() body: { messageId?: string; optionId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      if (!body?.messageId || !body.optionId) throw new ApplicationError('INVALID', 'Voto inválido.');
      const updated = await this.chatMessages.votePoll(body.messageId, body.optionId, client.data.user.id);
      if (!updated?.poll) throw new ApplicationError('NOT_FOUND', 'Enquete não encontrada.');
      await this.emitMessageUpdated(updated);
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível votar na enquete.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:typing')
  public handleTyping(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:typing', {
      conversationId: body.conversationId,
      senderName: client.data.user.name,
    });
  }

  @SubscribeMessage('chat:stop-typing')
  public handleStopTyping(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:stop-typing', {
      conversationId: body.conversationId,
      senderName: client.data.user.name,
    });
  }

  @SubscribeMessage('chat:read')
  public handleRead(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:read', {
      conversationId: body.conversationId,
      userId: client.data.user.id,
    });
  }

  @SubscribeMessage('chat:edit-message')
  public async handleEditMessage(@MessageBody() body: { messageId?: string; content?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      const content = body?.content?.trim();
      if (!content) throw new ApplicationError('EMPTY_CONTENT', 'Conteúdo não pode ser vazio.');
      if (!body?.messageId) throw new ApplicationError('INVALID', 'ID de mensagem inválido.');

      const message = await this.chatMessages.findById(body.messageId);
      if (!message) throw new ApplicationError('NOT_FOUND', 'Mensagem não encontrada.');
      if (message.senderId !== client.data.user.id) throw new ApplicationError('FORBIDDEN', 'Você não pode editar essa mensagem.');
      if (message.deletedAt) throw new ApplicationError('DELETED', 'Mensagem já foi apagada.');

      const updated = await this.chatMessages.updateContent(body.messageId, content);
      if (!updated) throw new ApplicationError('NOT_FOUND', 'Mensagem não encontrada.');

      await this.emitToConversationMembers(updated.conversationId, 'chat:message-edited', {
        messageId: updated.id,
        content: updated.content,
        editedAt: updated.editedAt!.toISOString(),
      });
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível editar a mensagem.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:delete-message')
  public async handleDeleteMessage(@MessageBody() body: { messageId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      if (!body?.messageId) throw new ApplicationError('INVALID', 'ID de mensagem inválido.');

      const message = await this.chatMessages.findById(body.messageId);
      if (!message) throw new ApplicationError('NOT_FOUND', 'Mensagem não encontrada.');
      if (message.senderId !== client.data.user.id) throw new ApplicationError('FORBIDDEN', 'Você não pode apagar essa mensagem.');

      const updated = await this.chatMessages.markDeleted(body.messageId);
      if (!updated) throw new ApplicationError('NOT_FOUND', 'Mensagem não encontrada.');

      await this.emitToConversationMembers(updated.conversationId, 'chat:message-deleted', {
        messageId: updated.id,
        deletedAt: updated.deletedAt!.toISOString(),
      });
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível apagar a mensagem.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:react')
  public async handleReact(@MessageBody() body: { messageId?: string; emoji?: string; action?: 'add' | 'remove' }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      if (!body?.messageId || !body?.emoji || !body?.action) return;

      const updated = await this.chatMessages.toggleReaction(body.messageId, body.emoji, client.data.user.id, body.action);
      if (!updated) throw new ApplicationError('NOT_FOUND', 'Mensagem não encontrada.');

      await this.emitToConversationMembers(updated.conversationId, 'chat:reaction', {
        messageId: updated.id,
        emoji: body.emoji,
        userId: client.data.user.id,
        action: body.action,
      });
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível reagir à mensagem.';
      client.emit('chat:error', { message });
    }
  }

  private extractToken(client: Socket) {
    const cookieToken = readAccessCookie(client.handshake.headers.cookie);
    if (cookieToken) return cookieToken;
    throw new Error('Missing token.');
  }

  private resolveId(value?: string) {
    const id = value?.trim();
    if (!id) throw new ApplicationError('INVALID', 'ID inválido.');
    return id;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  public async notifyConversationChanged(conversationId: string) {
    await this.emitToConversationMembers(conversationId, 'chat:conversation-updated', { conversationId });
  }

  private normalizeAttachments(attachments: IncomingAttachment[]): MessageAttachment[] {
    return attachments.slice(0, 4).map((attachment) => {
      if (attachment.type !== 'image' && attachment.type !== 'audio' && attachment.type !== 'video' && attachment.type !== 'document') {
        throw new ApplicationError('INVALID', 'Tipo de anexo inválido.');
      }
      if (!attachment.url || !attachment.name || !attachment.mimeType || typeof attachment.size !== 'number') {
        throw new ApplicationError('INVALID', 'Anexo inválido.');
      }
      return {
        type: attachment.type,
        url: attachment.url,
        name: attachment.name.slice(0, 180),
        mimeType: attachment.mimeType,
        size: attachment.size,
      };
    });
  }

  private normalizePoll(question: string | undefined, options: IncomingPollOption[] | undefined, allowMultiple: boolean): MessagePoll {
    const cleanQuestion = question?.trim();
    if (!cleanQuestion) throw new ApplicationError('INVALID', 'Informe a pergunta da enquete.');
    const cleanOptions = (options ?? [])
      .map((option) => ({
        id: option.id?.trim() || randomUUID(),
        text: option.text?.trim() ?? '',
        voterIds: option.voterIds ?? [],
      }))
      .filter((option) => option.text);
    if (cleanOptions.length < 2) throw new ApplicationError('INVALID', 'A enquete precisa de pelo menos duas opções.');
    if (cleanOptions.length > 8) throw new ApplicationError('INVALID', 'A enquete deve ter no máximo oito opções.');
    return {
      question: cleanQuestion.slice(0, 180),
      options: cleanOptions.map((option) => ({
        ...option,
        text: option.text.slice(0, 120),
      })),
      allowMultiple,
      closedAt: null,
    };
  }

  private async emitMessageUpdated(message: ChatMessageEntity) {
    await this.emitToConversationMembers(message.conversationId, 'chat:message-updated', ChatMessageMapper.toResponse(message));
  }

  private async emitToConversationMembers(conversationId: string, event: string, payload: unknown) {
    const memberships = await this.members.findByConversationId(conversationId);
    const rooms = memberships.map((member) => this.userRoom(member.userId));
    if (rooms.length) this.server.to(rooms).emit(event, payload);
  }
}

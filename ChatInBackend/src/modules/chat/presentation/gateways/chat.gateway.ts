import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { TokenService } from '../../../auth/application/ports/token-service.port';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { ListChatHistoryUseCase } from '../../application/use-cases/list-chat-history.use-case';
import { SendChatMessageUseCase } from '../../application/use-cases/send-chat-message.use-case';
import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ChatMessageMapper } from '../../infrastructure/persistence/mongoose/mappers/chat-message.mapper';

type AuthenticatedSocket = Socket & {
  data: {
    user?: { id: string; name: string; email: string };
  };
};

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(ListChatHistoryUseCase) private readonly listHistory: ListChatHistoryUseCase,
    @Inject(SendChatMessageUseCase) private readonly sendMessage: SendChatMessageUseCase,
    @Inject(ConversationMembersRepository) private readonly members: ConversationMembersRepository,
    @Inject(ChatMessagesRepository) private readonly chatMessages: ChatMessagesRepository,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
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

  handleDisconnect(_client: AuthenticatedSocket) {
    return;
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');
      const conversationId = this.resolveId(body?.conversationId);
      if (!await this.members.exists(conversationId, client.data.user.id)) {
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
      client.emit('chat:history', { conversationId, messages: messages.map(ChatMessageMapper.toResponse) });

      return { event: 'chat:joined', data: { conversationId } };
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível entrar na conversa.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody() body: { conversationId?: string; content?: string; replyToId?: string | null },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.data.user) throw new ApplicationError('UNAUTHENTICATED', 'Sessão inválida.');

      const conversationId = this.resolveId(body?.conversationId);

      let replyTo: { id: string; senderName: string; content: string } | null = null;
      if (body?.replyToId) {
        const referenced = await this.chatMessages.findById(body.replyToId);
        if (referenced && !referenced.deletedAt) {
          replyTo = { id: referenced.id!, senderName: referenced.senderName, content: referenced.content };
        }
      }

      const message = await this.sendMessage.execute({
        conversationId,
        senderId: client.data.user.id,
        content: body?.content ?? '',
        replyTo,
      });

      const response = ChatMessageMapper.toResponse(message);
      await this.emitToConversationMembers(conversationId, 'chat:message', response);
      return { event: 'chat:message:sent', data: response };
    } catch (error) {
      const message = error instanceof ApplicationError ? error.message : 'Não foi possível enviar a mensagem.';
      client.emit('chat:error', { message });
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:typing', {
      conversationId: body.conversationId,
      senderName: client.data.user.name,
    });
  }

  @SubscribeMessage('chat:stop-typing')
  handleStopTyping(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:stop-typing', {
      conversationId: body.conversationId,
      senderName: client.data.user.name,
    });
  }

  @SubscribeMessage('chat:read')
  handleRead(@MessageBody() body: { conversationId?: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.data.user || !body?.conversationId) return;
    client.to(body.conversationId).emit('chat:read', {
      conversationId: body.conversationId,
      userId: client.data.user.id,
    });
  }

  @SubscribeMessage('chat:edit-message')
  async handleEditMessage(
    @MessageBody() body: { messageId?: string; content?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
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
  async handleDeleteMessage(
    @MessageBody() body: { messageId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
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
  async handleReact(
    @MessageBody() body: { messageId?: string; emoji?: string; action?: 'add' | 'remove' },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
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
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }
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

  private async emitToConversationMembers(conversationId: string, event: string, payload: unknown) {
    const memberships = await this.members.findByConversationId(conversationId);
    const rooms = memberships.map((member) => this.userRoom(member.userId));
    if (rooms.length) this.server.to(rooms).emit(event, payload);
  }
}

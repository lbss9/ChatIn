import { ChatMessagesRepository } from '../../domain/repositories/chat-messages.repository';

export class ListChatHistoryUseCase {
  public constructor(private readonly messages: ChatMessagesRepository) {}

  public execute(conversationId: string, limit = 50) {
    return this.messages.findRecent(conversationId, Math.min(Math.max(limit, 1), 100));
  }
}

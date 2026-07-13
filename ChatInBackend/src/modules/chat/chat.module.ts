import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersRepository } from '../users/domain/repositories/users.repository';
import { UsersModule } from '../users/users.module';
import { CreateGroupConversationUseCase } from './application/use-cases/create-group-conversation.use-case';
import { ListChatHistoryUseCase } from './application/use-cases/list-chat-history.use-case';
import { ListConversationsUseCase } from './application/use-cases/list-conversations.use-case';
import { OpenDirectConversationUseCase } from './application/use-cases/open-direct-conversation.use-case';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { ChatMessagesRepository } from './domain/repositories/chat-messages.repository';
import { ConversationMembersRepository } from './domain/repositories/conversation-members.repository';
import { ConversationsRepository } from './domain/repositories/conversations.repository';
import { MongooseChatMessagesRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-chat-messages.repository';
import { MongooseConversationMembersRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-conversation-members.repository';
import { MongooseConversationsRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-conversations.repository';
import { ChatMessagePersistence, ChatMessageSchema } from './infrastructure/persistence/mongoose/schemas/chat-message.schema';
import { ConversationMemberPersistence, ConversationMemberSchema } from './infrastructure/persistence/mongoose/schemas/conversation-member.schema';
import { ConversationPersistence, ConversationSchema } from './infrastructure/persistence/mongoose/schemas/conversation.schema';
import { ConversationsController } from './presentation/controllers/conversations.controller';
import { ChatGateway } from './presentation/gateways/chat.gateway';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: ChatMessagePersistence.name, schema: ChatMessageSchema },
      { name: ConversationPersistence.name, schema: ConversationSchema },
      { name: ConversationMemberPersistence.name, schema: ConversationMemberSchema },
    ]),
  ],
  controllers: [ConversationsController],
  exports: [ConversationMembersRepository, ConversationsRepository, ChatMessagesRepository],
  providers: [
    { provide: ChatMessagesRepository, useClass: MongooseChatMessagesRepository },
    { provide: ConversationsRepository, useClass: MongooseConversationsRepository },
    { provide: ConversationMembersRepository, useClass: MongooseConversationMembersRepository },
    {
      provide: ListChatHistoryUseCase,
      useFactory: (messages: ChatMessagesRepository) => new ListChatHistoryUseCase(messages),
      inject: [ChatMessagesRepository],
    },
    {
      provide: ListConversationsUseCase,
      useFactory: (conversations: ConversationsRepository, members: ConversationMembersRepository) => new ListConversationsUseCase(conversations, members),
      inject: [ConversationsRepository, ConversationMembersRepository],
    },
    {
      provide: CreateGroupConversationUseCase,
      useFactory: (conversations: ConversationsRepository, members: ConversationMembersRepository, listConversations: ListConversationsUseCase) =>
        new CreateGroupConversationUseCase(conversations, members, listConversations),
      inject: [ConversationsRepository, ConversationMembersRepository, ListConversationsUseCase],
    },
    {
      provide: OpenDirectConversationUseCase,
      useFactory: (
        conversations: ConversationsRepository,
        members: ConversationMembersRepository,
        users: UsersRepository,
        listConversations: ListConversationsUseCase,
      ) => new OpenDirectConversationUseCase(conversations, members, users, listConversations),
      inject: [ConversationsRepository, ConversationMembersRepository, UsersRepository, ListConversationsUseCase],
    },
    {
      provide: SendChatMessageUseCase,
      useFactory: (
        messages: ChatMessagesRepository,
        users: UsersRepository,
        conversations: ConversationsRepository,
        members: ConversationMembersRepository,
      ) => new SendChatMessageUseCase(messages, users, conversations, members),
      inject: [ChatMessagesRepository, UsersRepository, ConversationsRepository, ConversationMembersRepository],
    },
    ChatGateway,
  ],
})
export class ChatModule {}

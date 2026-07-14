import { UserEntity } from '../../../users/domain/entities/user.entity';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { ConversationMemberEntity } from '../../domain/entities/conversation-member.entity';
import { ConversationMembersRepository } from '../../domain/repositories/conversation-members.repository';
import { ConversationsRepository } from '../../domain/repositories/conversations.repository';

export type ConversationSummary = {
  id: string;
  title: string;
  type: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  pinnedAt: string | null;
  mutedUntil: string | null;
  lastReadAt: string | null;
  members: Array<{ userId: string; displayName: string; role: string; lastReadAt: string | null }>;
};

export class ListConversationsUseCase {
  public constructor(
    private readonly conversations: ConversationsRepository,
    private readonly members: ConversationMembersRepository,
  ) {}

  public async execute(user: UserEntity) {
    await this.ensureGeneralConversation(user);

    const memberships = await this.members.findByUserId(user.id!);
    const conversationIds = memberships.map((membership) => membership.conversationId);
    const conversations = await this.conversations.findByIds(conversationIds);
    const summaries = await Promise.all(conversations.map((conv) => this.toSummary(conv, user.id!, memberships)));

    return summaries.sort((a, b) => {
      if (a.pinnedAt && !b.pinnedAt) return -1;
      if (!a.pinnedAt && b.pinnedAt) return 1;
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  private async ensureGeneralConversation(user: UserEntity) {
    let conversation = await this.conversations.findGeneral();
    if (!conversation) {
      conversation = await this.conversations.save(
        new ConversationEntity({
          title: 'ChatIn geral',
          type: 'group',
          createdById: user.id!,
        }),
      );
    }

    if (!(await this.members.exists(conversation.id!, user.id!))) {
      await this.members.save(
        new ConversationMemberEntity({
          conversationId: conversation.id!,
          userId: user.id!,
          displayName: user.name,
          role: conversation.createdById === user.id ? 'admin' : 'member',
        }),
      );
    }
  }

  private async toSummary(conversation: ConversationEntity, currentUserId: string, userMemberships: ConversationMemberEntity[]): Promise<ConversationSummary> {
    const members = await this.members.findByConversationId(conversation.id!);
    const directPeer = conversation.type === 'direct' ? members.find((m) => m.userId !== currentUserId) : null;
    const mine = userMemberships.find((m) => m.conversationId === conversation.id!);
    return {
      id: conversation.id!,
      title: directPeer?.displayName ?? conversation.title,
      type: conversation.type,
      lastMessagePreview: conversation.lastMessagePreview ?? null,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      pinnedAt: mine?.pinnedAt?.toISOString() ?? null,
      mutedUntil: mine?.mutedUntil?.toISOString() ?? null,
      lastReadAt: mine?.lastReadAt?.toISOString() ?? null,
      members: members.map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        role: m.role,
        lastReadAt: m.lastReadAt?.toISOString() ?? null,
      })),
    };
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConversationMemberRole } from '../../../../domain/entities/conversation-member.entity';

export type ConversationMemberDocument = HydratedDocument<ConversationMemberPersistence>;

@Schema({ timestamps: true, collection: 'conversation_members' })
export class ConversationMemberPersistence {
  @Prop({ required: true, trim: true, index: true })
  public conversationId!: string;

  @Prop({ required: true, trim: true, index: true })
  public userId!: string;

  @Prop({ required: true, trim: true })
  public displayName!: string;

  @Prop({ required: true, enum: ['admin', 'member'], default: 'member' })
  public role!: ConversationMemberRole;

  @Prop({ required: true })
  public joinedAt!: Date;

  @Prop({ type: Date, default: null })
  public pinnedAt?: Date | null;

  @Prop({ type: Date, default: null })
  public mutedUntil?: Date | null;

  @Prop({ type: Date, default: null })
  public lastReadAt?: Date | null;

  @Prop({ type: Date, default: null })
  public deletedAt?: Date | null;
}

export const ConversationMemberSchema = SchemaFactory.createForClass(ConversationMemberPersistence);
ConversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConversationMemberRole } from '../../../../domain/entities/conversation-member.entity';

export type ConversationMemberDocument = HydratedDocument<ConversationMemberPersistence>;

@Schema({ timestamps: true, collection: 'conversation_members' })
export class ConversationMemberPersistence {
  @Prop({ required: true, trim: true, index: true })
  conversationId!: string;

  @Prop({ required: true, trim: true, index: true })
  userId!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, enum: ['admin', 'member'], default: 'member' })
  role!: ConversationMemberRole;

  @Prop({ required: true })
  joinedAt!: Date;

  @Prop({ type: Date, default: null })
  pinnedAt?: Date | null;

  @Prop({ type: Date, default: null })
  mutedUntil?: Date | null;

  @Prop({ type: Date, default: null })
  lastReadAt?: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const ConversationMemberSchema = SchemaFactory.createForClass(ConversationMemberPersistence);
ConversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessagePersistence>;

class ReplyContextPersistence {
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) senderName!: string;
  @Prop({ required: true }) content!: string;
}

class ReactionPersistence {
  @Prop({ required: true }) emoji!: string;
  @Prop({ type: [String], default: [] }) userIds!: string[];
}

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessagePersistence {
  @Prop({ required: true, trim: true, index: true })
  conversationId!: string;

  @Prop({ required: true, trim: true })
  senderId!: string;

  @Prop({ required: true, trim: true })
  senderName!: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  content!: string;

  @Prop({ type: ReplyContextPersistence, default: null })
  replyTo?: ReplyContextPersistence | null;

  @Prop({ type: [ReactionPersistence], default: [] })
  reactions!: ReactionPersistence[];

  @Prop({ type: Date, default: null })
  editedAt?: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessagePersistence);
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

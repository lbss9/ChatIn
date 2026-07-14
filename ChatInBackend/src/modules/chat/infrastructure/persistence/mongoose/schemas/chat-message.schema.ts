import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessagePersistence>;

class ReplyContextPersistence {
  @Prop({ required: true }) public id!: string;
  @Prop({ required: true }) public senderName!: string;
  @Prop({ default: '' }) public content!: string;
}

class ReactionPersistence {
  @Prop({ required: true }) public emoji!: string;
  @Prop({ type: [String], default: [] }) public userIds!: string[];
}

class AttachmentPersistence {
  @Prop({ required: true, enum: ['image', 'audio', 'video', 'document'] }) public type!: string;
  @Prop({ required: true }) public url!: string;
  @Prop({ required: true }) public name!: string;
  @Prop({ required: true }) public mimeType!: string;
  @Prop({ required: true }) public size!: number;
}

class PollOptionPersistence {
  @Prop({ required: true }) public id!: string;
  @Prop({ required: true, maxlength: 120 }) public text!: string;
  @Prop({ type: [String], default: [] }) public voterIds!: string[];
}

class PollPersistence {
  @Prop({ required: true, maxlength: 180 }) public question!: string;
  @Prop({ type: [PollOptionPersistence], default: [] }) public options!: PollOptionPersistence[];
  @Prop({ default: false }) public allowMultiple!: boolean;
  @Prop({ type: Date, default: null }) public closedAt?: Date | null;
}

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessagePersistence {
  @Prop({ required: true, trim: true, index: true })
  public conversationId!: string;

  @Prop({ required: true, trim: true })
  public senderId!: string;

  @Prop({ required: true, trim: true })
  public senderName!: string;

  @Prop({ trim: true, maxlength: 1000, default: '' })
  public content!: string;

  @Prop({ type: ReplyContextPersistence, default: null })
  public replyTo?: ReplyContextPersistence | null;

  @Prop({ type: [ReactionPersistence], default: [] })
  public reactions!: ReactionPersistence[];

  @Prop({ type: [AttachmentPersistence], default: [] })
  public attachments!: AttachmentPersistence[];

  @Prop({ type: PollPersistence, default: null })
  public poll?: PollPersistence | null;

  @Prop({ type: Date, default: null })
  public editedAt?: Date | null;

  @Prop({ type: Date, default: null })
  public deletedAt?: Date | null;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessagePersistence);
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

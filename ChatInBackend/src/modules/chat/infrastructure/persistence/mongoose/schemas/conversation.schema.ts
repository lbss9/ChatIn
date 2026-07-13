import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConversationType } from '../../../../domain/entities/conversation.entity';

export type ConversationDocument = HydratedDocument<ConversationPersistence>;

@Schema({ timestamps: true, collection: 'conversations' })
export class ConversationPersistence {
  @Prop({ required: true, trim: true, maxlength: 80 })
  title!: string;

  @Prop({ required: true, enum: ['group', 'direct'], index: true })
  type!: ConversationType;

  @Prop({ required: true, trim: true })
  createdById!: string;

  @Prop({ trim: true, maxlength: 140 })
  lastMessagePreview?: string;

  @Prop()
  lastMessageAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationPersistence);
ConversationSchema.index({ type: 1, title: 1 });

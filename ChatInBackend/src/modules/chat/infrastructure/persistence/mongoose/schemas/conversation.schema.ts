import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConversationType } from '../../../../domain/entities/conversation.entity';

export type ConversationDocument = HydratedDocument<ConversationPersistence>;

@Schema({ timestamps: true, collection: 'conversations' })
export class ConversationPersistence {
  @Prop({ required: true, trim: true, maxlength: 80 })
  public title!: string;

  @Prop({ required: true, enum: ['group', 'direct'], index: true })
  public type!: ConversationType;

  @Prop({ required: true, trim: true })
  public createdById!: string;

  @Prop({ trim: true, maxlength: 140 })
  public lastMessagePreview?: string;

  @Prop()
  public lastMessageAt?: Date;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationPersistence);
ConversationSchema.index({ type: 1, title: 1 });

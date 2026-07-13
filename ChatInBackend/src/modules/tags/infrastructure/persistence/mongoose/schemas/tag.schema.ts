import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<TagPersistence>;

@Schema({ timestamps: true, collection: 'tags' })
export class TagPersistence {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  emoji!: string | null;

  @Prop({ type: String, default: null })
  color!: string | null;

  @Prop({ type: String, default: null })
  imageUrl!: string | null;

  @Prop({ type: [String], default: [] })
  conversationIds!: string[];

  @Prop({ default: 0 })
  order!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TagSchema = SchemaFactory.createForClass(TagPersistence);

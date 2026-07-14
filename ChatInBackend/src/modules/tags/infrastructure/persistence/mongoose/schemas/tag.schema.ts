import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<TagPersistence>;

@Schema({ timestamps: true, collection: 'tags' })
export class TagPersistence {
  @Prop({ required: true, index: true })
  public userId!: string;

  @Prop({ required: true, trim: true })
  public name!: string;

  @Prop({ type: String, default: null })
  public emoji!: string | null;

  @Prop({ type: String, default: null })
  public color!: string | null;

  @Prop({ type: String, default: null })
  public imageUrl!: string | null;

  @Prop({ type: [String], default: [] })
  public conversationIds!: string[];

  @Prop({ default: 0 })
  public order!: number;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const TagSchema = SchemaFactory.createForClass(TagPersistence);

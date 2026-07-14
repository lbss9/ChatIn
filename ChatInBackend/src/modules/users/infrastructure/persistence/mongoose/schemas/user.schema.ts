import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserPersistence>;

export class UserBadgePersistence {
  @Prop({ required: true, trim: true, maxlength: 80 })
  public code!: string;

  @Prop({ required: true })
  public awardedAt!: Date;
}

@Schema({ timestamps: true, collection: 'users' })
export class UserPersistence {
  @Prop({ trim: true, maxlength: 100 })
  public name?: string;

  @Prop({ required: true, trim: true, maxlength: 40 })
  public firstName!: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  public lastName!: string;

  @Prop({ trim: true, maxlength: 32, sparse: true }) public nickname?: string;
  @Prop({ trim: true, maxlength: 240 }) public bio?: string;
  @Prop({ trim: true, maxlength: 500 }) public coverUrl?: string;
  @Prop({ trim: true, maxlength: 40, default: 'center center' }) public coverPosition!: string;
  @Prop({ type: [UserBadgePersistence], default: [] }) public badges!: Array<string | UserBadgePersistence>;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  public email!: string;

  @Prop({ required: true })
  public passwordHash!: string;

  @Prop({ type: [String], default: [] })
  public refreshTokenHashes!: string[];

  @Prop()
  public passwordResetTokenHash?: string;

  @Prop()
  public passwordResetExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserPersistence);
UserSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

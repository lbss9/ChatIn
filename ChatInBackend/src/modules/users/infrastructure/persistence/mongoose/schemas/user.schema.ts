import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserPersistence>;

export class UserBadgePersistence {
  @Prop({ required: true, trim: true, maxlength: 80 })
  code!: string;

  @Prop({ required: true })
  awardedAt!: Date;
}

@Schema({ timestamps: true, collection: 'users' })
export class UserPersistence {
  @Prop({ trim: true, maxlength: 100 })
  name?: string;

  @Prop({ required: true, trim: true, maxlength: 40 })
  firstName!: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  lastName!: string;

  @Prop({ trim: true, maxlength: 32, sparse: true }) nickname?: string;
  @Prop({ trim: true, maxlength: 240 }) bio?: string;
  @Prop({ trim: true, maxlength: 500 }) coverUrl?: string;
  @Prop({ trim: true, maxlength: 40, default: 'center center' }) coverPosition!: string;
  @Prop({ type: [UserBadgePersistence], default: [] }) badges!: Array<string | UserBadgePersistence>;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: [String], default: [] })
  refreshTokenHashes!: string[];

  @Prop()
  passwordResetTokenHash?: string;

  @Prop()
  passwordResetExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserPersistence);
UserSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

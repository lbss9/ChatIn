import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { UsersRepository } from '../../../../domain/repositories/users.repository';
import { UserMapper } from '../mappers/user.mapper';
import { UserDocument, UserPersistence } from '../schemas/user.schema';

@Injectable()
export class MongooseUsersRepository implements UsersRepository {
  constructor(@InjectModel(UserPersistence.name) private readonly model: Model<UserDocument>) {}

  async existsByEmail(email: string) {
    return Boolean(await this.model.exists({ email: email.toLowerCase() }));
  }

  async findByEmail(email: string) {
    const document = await this.model.findOne({ email: email.toLowerCase() });
    return document ? UserMapper.toDomain(document) : null;
  }

  async findById(id: string) {
    const document = await this.model.findById(id);
    return document ? UserMapper.toDomain(document) : null;
  }

  async findByPasswordResetToken(tokenHash: string, now: Date) {
    const document = await this.model.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: now } });
    return document ? UserMapper.toDomain(document) : null;
  }

  async save(user: UserEntity) {
    const data = UserMapper.toPersistence(user);
    const document = user.id
      ? await this.model.findByIdAndUpdate(user.id, data, { returnDocument: 'after', runValidators: true })
      : await this.model.create(data);
    if (!document) throw new Error('User persistence failed.');
    return UserMapper.toDomain(document);
  }

  async deleteById(id: string) {
    await this.model.findByIdAndDelete(id);
  }
}

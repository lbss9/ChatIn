import { UserEntity } from '../../../../domain/entities/user.entity';
import { UserDocument } from '../schemas/user.schema';

export class UserMapper {
  static toDomain(document: UserDocument): UserEntity {
    const legacyName = document.name?.trim() ?? '';
    const [legacyFirstName = '', ...legacyLastNameParts] = legacyName.split(' ').filter(Boolean);

    return new UserEntity({
      id: document._id.toString(),
      name: legacyName || `${document.firstName ?? legacyFirstName} ${document.lastName ?? legacyLastNameParts.join(' ')}`.trim(),
      nickname: document.nickname,
      bio: document.bio,
      coverUrl: document.coverUrl,
      coverPosition: document.coverPosition,
      badges: (document.badges ?? []).map((badge) => typeof badge === 'string' ? badge : { code: badge.code, awardedAt: badge.awardedAt }),
      email: document.email,
      passwordHash: document.passwordHash,
      refreshTokenHashes: document.refreshTokenHashes,
      passwordResetTokenHash: document.passwordResetTokenHash,
      passwordResetExpiresAt: document.passwordResetExpiresAt,
    });
  }

  static toPersistence(entity: UserEntity) {
    return {
      name: entity.name,
      firstName: entity.firstName,
      lastName: entity.lastName,
      nickname: entity.nickname,
      bio: entity.bio,
      coverUrl: entity.coverUrl,
      coverPosition: entity.coverPosition,
      badges: entity.badges,
      email: entity.email,
      passwordHash: entity.passwordHash,
      refreshTokenHashes: entity.refreshTokenHashes,
      passwordResetTokenHash: entity.passwordResetTokenHash,
      passwordResetExpiresAt: entity.passwordResetExpiresAt,
    };
  }
}

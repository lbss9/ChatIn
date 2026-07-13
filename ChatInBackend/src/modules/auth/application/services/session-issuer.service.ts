import { UserEntity } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; nickname?: string; email: string; bio?: string; coverUrl?: string; coverPosition: string; badges: Array<{ code: string; awardedAt: Date }> };
};

export class SessionIssuer {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async issue(user: UserEntity): Promise<AuthSession> {
    if (!user.id) throw new Error('A persisted user is required to issue a session.');
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.tokens.signAccessToken(payload);
    const refreshToken = await this.tokens.signRefreshToken(payload);
    user.addRefreshTokenHash(await this.hasher.hash(refreshToken));
    await this.users.save(user);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        bio: user.bio,
        coverUrl: user.coverUrl,
        coverPosition: user.coverPosition,
        badges: user.badges,
      },
    };
  }
}

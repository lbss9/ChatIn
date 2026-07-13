import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { SessionIssuer } from '../services/session-issuer.service';

export class RefreshSessionUseCase {
  constructor(private readonly users: UsersRepository, private readonly hasher: PasswordHasher, private readonly tokens: TokenService, private readonly sessions: SessionIssuer) {}

  async execute(refreshToken: string) {
    try {
      const payload = await this.tokens.verifyRefreshToken(refreshToken);
      const user = await this.users.findById(payload.sub);
      if (!user) throw new Error();
      const matches = await Promise.all(user.refreshTokenHashes.map((hash) => this.hasher.compare(refreshToken, hash)));
      const indexes = matches.flatMap((matchesToken, index) => matchesToken ? [index] : []);
      if (!indexes.length) throw new Error();
      user.removeRefreshTokenHashes(indexes);
      await this.users.save(user);
      return this.sessions.issue(user);
    } catch {
      throw new ApplicationError('INVALID_REFRESH_TOKEN', 'Refresh token inválido ou expirado.');
    }
  }
}

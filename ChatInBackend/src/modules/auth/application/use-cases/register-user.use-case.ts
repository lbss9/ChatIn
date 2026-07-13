import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { SessionIssuer } from '../services/session-issuer.service';

export type RegisterUserInput = { name: string; nickname: string; email: string; password: string };

export class RegisterUserUseCase {
  constructor(private readonly users: UsersRepository, private readonly hasher: PasswordHasher, private readonly sessions: SessionIssuer) {}

  async execute(input: RegisterUserInput) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.existsByEmail(email)) throw new ApplicationError('EMAIL_ALREADY_IN_USE', 'Este e-mail já está em uso.');
    const user = new UserEntity({
      name: input.name,
      nickname: input.nickname,
      email,
      passwordHash: await this.hasher.hash(input.password),
      badges: [{ code: 'early-access', awardedAt: new Date() }],
    });
    return this.sessions.issue(await this.users.save(user));
  }
}

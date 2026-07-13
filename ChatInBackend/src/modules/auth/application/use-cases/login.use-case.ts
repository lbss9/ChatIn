import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { SessionIssuer } from '../services/session-issuer.service';

export type LoginInput = { email: string; password: string };

export class LoginUseCase {
  constructor(private readonly users: UsersRepository, private readonly hasher: PasswordHasher, private readonly sessions: SessionIssuer) {}

  async execute(input: LoginInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await this.hasher.compare(input.password, user.passwordHash))) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }
    return this.sessions.issue(user);
  }
}

import { createHash } from 'crypto';
import { ApplicationError } from '../../../../shared/domain/errors/application.error';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';

export type ResetPasswordInput = { token: string; password: string };

export class ResetPasswordUseCase {
  public constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  public async execute(input: ResetPasswordInput) {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const user = await this.users.findByPasswordResetToken(tokenHash, new Date());
    if (!user) throw new ApplicationError('INVALID_PASSWORD_RESET_TOKEN', 'Token inválido ou expirado.');
    user.resetPassword(await this.hasher.hash(input.password));
    await this.users.save(user);
    return { message: 'Senha redefinida com sucesso.' };
  }
}

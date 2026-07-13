import { createHash, randomBytes } from 'crypto';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordResetMailer } from '../ports/password-reset-mailer.port';

export class RecoverPasswordUseCase {
  constructor(private readonly users: UsersRepository, private readonly mailer: PasswordResetMailer) {}

  async execute(email: string) {
    const user = await this.users.findByEmail(email);
    const response = { message: 'Se o e-mail existir, enviaremos as instruções.' };
    if (!user) return response;
    const token = randomBytes(32).toString('hex');
    user.startPasswordReset(createHash('sha256').update(token).digest('hex'), new Date(Date.now() + 3_600_000));
    await this.users.save(user);
    await this.mailer.send(user.email, token);
    return response;
  }
}

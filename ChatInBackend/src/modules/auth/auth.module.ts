import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersRepository } from '../users/domain/repositories/users.repository';
import { UsersModule } from '../users/users.module';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { PasswordResetMailer } from './application/ports/password-reset-mailer.port';
import { TokenService } from './application/ports/token-service.port';
import { SessionIssuer } from './application/services/session-issuer.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RecoverPasswordUseCase } from './application/use-cases/recover-password.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { BcryptPasswordHasher } from './infrastructure/crypto/bcrypt-password-hasher.adapter';
import { JwtTokenService } from './infrastructure/jwt/jwt-token-service.adapter';
import { SmtpPasswordResetMailer } from './infrastructure/mail/smtp-password-reset-mailer.adapter';
import { AccessTokenGuard } from './infrastructure/http/access-token.guard';
import { AuthController } from './presentation/controllers/auth.controller';

const applicationProviders = [
  { provide: SessionIssuer, useFactory: (users: UsersRepository, hasher: PasswordHasher, tokens: TokenService) => new SessionIssuer(users, hasher, tokens), inject: [UsersRepository, PasswordHasher, TokenService] },
  { provide: RegisterUserUseCase, useFactory: (users: UsersRepository, hasher: PasswordHasher, sessions: SessionIssuer) => new RegisterUserUseCase(users, hasher, sessions), inject: [UsersRepository, PasswordHasher, SessionIssuer] },
  { provide: LoginUseCase, useFactory: (users: UsersRepository, hasher: PasswordHasher, sessions: SessionIssuer) => new LoginUseCase(users, hasher, sessions), inject: [UsersRepository, PasswordHasher, SessionIssuer] },
  { provide: RefreshSessionUseCase, useFactory: (users: UsersRepository, hasher: PasswordHasher, tokens: TokenService, sessions: SessionIssuer) => new RefreshSessionUseCase(users, hasher, tokens, sessions), inject: [UsersRepository, PasswordHasher, TokenService, SessionIssuer] },
  { provide: RecoverPasswordUseCase, useFactory: (users: UsersRepository, mailer: PasswordResetMailer) => new RecoverPasswordUseCase(users, mailer), inject: [UsersRepository, PasswordResetMailer] },
  { provide: ResetPasswordUseCase, useFactory: (users: UsersRepository, hasher: PasswordHasher) => new ResetPasswordUseCase(users, hasher), inject: [UsersRepository, PasswordHasher] },
];

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    { provide: PasswordResetMailer, useClass: SmtpPasswordResetMailer },
    AccessTokenGuard,
    ...applicationProviders,
  ],
  exports: [TokenService, AccessTokenGuard, UsersModule],
})
export class AuthModule {}

import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../../application/ports/password-hasher.port';
import { TokenService } from '../../application/ports/token-service.port';
import { AuthSession } from '../../application/services/session-issuer.service';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RecoverPasswordUseCase } from '../../application/use-cases/recover-password.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { AccessTokenGuard } from '../../infrastructure/http/access-token.guard';
import { clearAuthCookies, readRefreshCookie, setAuthCookies } from '../../infrastructure/http/auth-cookie.utils';
import { CurrentUser } from '../../infrastructure/http/current-user.decorator';
import {
  ChangeEmailDto,
  ChangePasswordDto,
  DeleteAccountDto,
  LoginDto,
  LogoutDto,
  RecoverPasswordDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from '../dto/auth.dto';
import { UserEntity } from '../../../users/domain/entities/user.entity';

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly recoverPassword: RecoverPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  public async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.registerUser.execute(dto);
    setAuthCookies(response, session, this.cookieOptions());
    return this.toSessionResponse(session);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  public async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.loginUser.execute(dto);
    setAuthCookies(response, session, this.cookieOptions());
    return this.toSessionResponse(session);
  }

  @Post('refresh')
  @HttpCode(200)
  public async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readRefreshCookie(request.headers.cookie);
    if (!refreshToken) throw new BadRequestException('Sessão inválida.');
    const session = await this.refreshSession.execute(refreshToken);
    setAuthCookies(response, session, this.cookieOptions());
    return this.toSessionResponse(session);
  }

  @Post('recover-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  public recover(@Body() dto: RecoverPasswordDto) {
    return this.recoverPassword.execute(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  public reset(@Body() dto: ResetPasswordDto) {
    return this.resetPassword.execute(dto);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  public me(@CurrentUser() user: UserEntity) {
    return this.toProfile(user);
  }

  @Patch('profile')
  @UseGuards(AccessTokenGuard)
  public async updateProfile(@CurrentUser() user: UserEntity, @Body() dto: UpdateProfileDto) {
    user.updateProfile(dto);
    const updated = await this.users.save(user);
    return this.toProfile(updated);
  }

  @Patch('password')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  public async changePassword(@CurrentUser() user: UserEntity, @Body() dto: ChangePasswordDto) {
    const matches = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Senha atual incorreta.');
    user.resetPassword(await this.hasher.hash(dto.newPassword));
    await this.users.save(user);
    return { success: true };
  }

  @Patch('email')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  public async changeEmail(@CurrentUser() user: UserEntity, @Body() dto: ChangeEmailDto) {
    const matches = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Senha atual incorreta.');
    const normalizedEmail = dto.email.trim().toLowerCase();
    if (normalizedEmail !== user.email && (await this.users.existsByEmail(normalizedEmail))) {
      throw new ConflictException('Este e-mail já está em uso.');
    }
    user.updateEmail(normalizedEmail);
    user.clearRefreshTokens();
    const updated = await this.users.save(user);
    return this.toProfile(updated);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  public async logout(@CurrentUser() user: UserEntity, @Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() dto: LogoutDto) {
    const refreshToken = readRefreshCookie(request.headers.cookie) ?? dto.refreshToken;
    if (refreshToken) {
      try {
        await this.tokens.verifyRefreshToken(refreshToken);
        const matches = await Promise.all(user.refreshTokenHashes.map((hash) => this.hasher.compare(refreshToken, hash)));
        user.removeRefreshTokenHashes(matches.flatMap((matched, index) => (matched ? [index] : [])));
      } catch {
        user.clearRefreshTokens();
      }
    } else {
      user.clearRefreshTokens();
    }
    await this.users.save(user);
    clearAuthCookies(response, this.cookieOptions());
    return { success: true };
  }

  @Delete('account')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  public async deleteAccount(@CurrentUser() user: UserEntity, @Body() dto: DeleteAccountDto) {
    const matches = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Senha atual incorreta.');
    if (dto.confirmation.trim().toUpperCase() !== 'EXCLUIR') {
      throw new BadRequestException('Digite "EXCLUIR" para confirmar.');
    }
    if (!user.id) throw new BadRequestException('Conta inválida.');
    await this.users.deleteById(user.id);
    return { success: true };
  }

  private toProfile(user: UserEntity) {
    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      bio: user.bio,
      coverUrl: user.coverUrl,
      coverPosition: user.coverPosition,
      badges: user.badges,
    };
  }

  private toSessionResponse(session: AuthSession) {
    return { user: session.user };
  }

  private cookieOptions() {
    return { production: this.config.get<string>('NODE_ENV') === 'production' };
  }
}

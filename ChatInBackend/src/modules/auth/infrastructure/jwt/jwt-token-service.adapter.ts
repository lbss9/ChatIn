import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload, TokenService } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  signAccessToken(payload: AuthTokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as never,
    });
  }

  signRefreshToken(payload: AuthTokenPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as never,
    });
  }

  verifyAccessToken(token: string) {
    return this.jwt.verifyAsync<AuthTokenPayload>(token, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verifyAsync<AuthTokenPayload>(token, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
  }
}

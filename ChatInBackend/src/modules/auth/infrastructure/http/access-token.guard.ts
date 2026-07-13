import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../../application/ports/token-service.port';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { UserEntity } from '../../../users/domain/entities/user.entity';

export type AuthenticatedRequest = Request & { user: UserEntity };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Sessão inválida.');

    try {
      const payload = await this.tokens.verifyAccessToken(authorization.slice('Bearer '.length).trim());
      const user = await this.users.findById(payload.sub);
      if (!user) throw new Error('User not found.');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida.');
    }
  }
}

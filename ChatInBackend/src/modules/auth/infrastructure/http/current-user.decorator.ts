import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { AuthenticatedRequest } from './access-token.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserEntity => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

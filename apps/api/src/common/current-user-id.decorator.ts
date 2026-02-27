import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard';

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  const userId = request.auth?.userId;

  if (!userId) {
    throw new UnauthorizedException('User is not authenticated.');
  }

  return userId;
});

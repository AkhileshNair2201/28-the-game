import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { AuthTokenService } from '../auth/auth-token.service';

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  auth?: {
    userId: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthTokenService) private readonly authTokenService: AuthTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header.');
    }

    request.auth = this.authTokenService.verifyToken(token);
    return true;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadEnvConfig } from '../config/env';

interface TokenPayload {
  sub: string;
  typ: 'guest';
  iat: number;
}

interface AuthTokenPayload {
  userId: string;
}

@Injectable()
export class AuthTokenService {
  private readonly env = loadEnvConfig();

  createToken(payload: AuthTokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const body: TokenPayload = {
      sub: payload.userId,
      typ: 'guest',
      iat: Math.floor(Date.now() / 1000)
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedBody = this.base64UrlEncode(JSON.stringify(body));
    const signature = this.sign(`${encodedHeader}.${encodedBody}`);

    return `${encodedHeader}.${encodedBody}.${signature}`;
  }

  verifyToken(token: string): AuthTokenPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format.');
    }

    const encodedHeader = parts[0];
    const encodedBody = parts[1];
    const signature = parts[2];

    if (!encodedHeader || !encodedBody || !signature) {
      throw new UnauthorizedException('Invalid token parts.');
    }

    const signingInput = `${encodedHeader}.${encodedBody}`;
    const expectedSignature = this.sign(signingInput);

    if (!this.safeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Token signature mismatch.');
    }

    const decodedBody = this.base64UrlDecode(encodedBody);
    const payload = JSON.parse(decodedBody) as TokenPayload;

    if (!payload.sub || payload.typ !== 'guest') {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return {
      userId: payload.sub
    };
  }

  private sign(value: string): string {
    return createHmac('sha256', this.env.jwtSecret).update(value).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}

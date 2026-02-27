import { describe, expect, it } from 'vitest';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  it('creates and verifies a token', () => {
    process.env.JWT_SECRET = 'test-jwt-secret-123456';
    const service = new AuthTokenService();

    const token = service.createToken({ userId: 'user-1' });
    const payload = service.verifyToken(token);

    expect(payload.userId).toBe('user-1');
  });

  it('rejects tampered token', () => {
    process.env.JWT_SECRET = 'test-jwt-secret-123456';
    const service = new AuthTokenService();

    const token = service.createToken({ userId: 'user-2' });
    const tampered = `${token}x`;

    expect(() => service.verifyToken(tampered)).toThrow();
  });
});

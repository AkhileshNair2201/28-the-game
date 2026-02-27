import { describe, expect, it } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('creates guest with provided nickname', () => {
    const service = new UsersService();
    const user = service.createGuest('PlayerOne');

    expect(user.userId).toBeTruthy();
    expect(user.nickname).toBe('PlayerOne');
    expect(user.isGuest).toBe(true);
  });

  it('updates nickname', () => {
    const service = new UsersService();
    const user = service.createGuest('PlayerOne');
    const updated = service.updateNickname(user.userId, 'PlayerTwo');

    expect(updated.nickname).toBe('PlayerTwo');
  });

  it('blocks invalid nickname', () => {
    const service = new UsersService();

    expect(() => service.createGuest('a')).toThrow();
    expect(() => service.createGuest('bad@name')).toThrow();
    expect(() => service.createGuest('admin-user')).toThrow();
  });
});

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PublicUser, UserRecord } from './users.types';

const MIN_NICKNAME_LENGTH = 3;
const MAX_NICKNAME_LENGTH = 20;
const SAFE_NICKNAME_REGEX = /^[a-zA-Z0-9 _-]+$/;
const BLOCKED_TERMS = ['admin', 'moderator', 'fuck', 'shit'];

@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserRecord>();

  createGuest(nickname?: string): UserRecord {
    const userId = randomUUID();
    const normalizedNickname = nickname?.trim() ? this.validateNickname(nickname) : this.generateGuestNickname();
    const now = new Date().toISOString();

    const record: UserRecord = {
      userId,
      nickname: normalizedNickname,
      isGuest: true,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, record);
    return record;
  }

  updateNickname(userId: string, nickname: string): UserRecord {
    const user = this.users.get(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const sanitizedNickname = this.validateNickname(nickname);
    user.nickname = sanitizedNickname;
    user.updatedAt = new Date().toISOString();

    this.users.set(userId, user);
    return user;
  }

  getById(userId: string): UserRecord {
    const user = this.users.get(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  toPublicUser(user: UserRecord): PublicUser {
    return {
      userId: user.userId,
      nickname: user.nickname,
      isGuest: user.isGuest
    };
  }

  private validateNickname(nickname: string): string {
    const trimmed = nickname.trim();

    if (trimmed.length < MIN_NICKNAME_LENGTH || trimmed.length > MAX_NICKNAME_LENGTH) {
      throw new BadRequestException(
        `Nickname must be between ${MIN_NICKNAME_LENGTH} and ${MAX_NICKNAME_LENGTH} characters.`
      );
    }

    if (!SAFE_NICKNAME_REGEX.test(trimmed)) {
      throw new BadRequestException('Nickname contains invalid characters.');
    }

    const normalizedLower = trimmed.toLowerCase();
    const hasBlockedTerm = BLOCKED_TERMS.some((term) => normalizedLower.includes(term));

    if (hasBlockedTerm) {
      throw new BadRequestException('Nickname contains blocked terms.');
    }

    return trimmed;
  }

  private generateGuestNickname(): string {
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    return `Guest-${suffix}`;
  }
}

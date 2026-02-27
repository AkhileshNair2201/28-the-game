export interface UserRecord {
  userId: string;
  nickname: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  userId: string;
  nickname: string;
  isGuest: boolean;
}

export interface GuestSession {
  userId: string;
  nickname: string;
  token: string;
  isGuest: boolean;
}

export interface PublicUser {
  userId: string;
  nickname: string;
  isGuest: boolean;
}

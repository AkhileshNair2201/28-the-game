export type GameErrorCode =
  | 'INVALID_PHASE'
  | 'INVALID_TURN'
  | 'INVALID_BID'
  | 'BID_REQUIRED'
  | 'CARD_NOT_IN_HAND'
  | 'ILLEGAL_CARD'
  | 'INVALID_TRUMP'
  | 'TRUMP_NOT_AVAILABLE'
  | 'TRUMP_ALREADY_REVEALED'
  | 'TRUMP_REVEAL_NOT_ALLOWED'
  | 'PAIR_NOT_ALLOWED'
  | 'PAIR_ALREADY_DECLARED'
  | 'PAIR_REQUIREMENTS_NOT_MET';

export class GameRuleError extends Error {
  code: GameErrorCode;

  constructor(code: GameErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

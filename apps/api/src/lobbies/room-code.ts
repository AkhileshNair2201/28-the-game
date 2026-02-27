const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIALS = '-_';
const ALL = `${LETTERS}${DIGITS}${SPECIALS}`;

function randomCharFrom(pool: string): string {
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? 'A';
}

function shuffle(input: string[]): string[] {
  const output = [...input];

  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [output[i], output[j]] = [output[j] ?? output[i] ?? '', output[i] ?? output[j] ?? ''];
  }

  return output;
}

export function generateRoomCode(length = 6): string {
  if (length < 3) {
    throw new Error('Room code length must be at least 3.');
  }

  const chars = [
    randomCharFrom(LETTERS),
    randomCharFrom(DIGITS),
    randomCharFrom(SPECIALS)
  ];

  while (chars.length < length) {
    chars.push(randomCharFrom(ALL));
  }

  return shuffle(chars).join('');
}

export function isValidRoomCode(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{6}$/.test(value)) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSpecial = /[-_]/.test(value);

  return hasLetter && hasDigit && hasSpecial;
}

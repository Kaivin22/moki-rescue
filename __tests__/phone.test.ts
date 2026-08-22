import { normalizeVietnamesePhone } from '../src/features/auth/phone';

describe('normalizeVietnamesePhone', () => {
  it('normalizes local Vietnamese phone numbers', () => {
    expect(normalizeVietnamesePhone('0901 234 567')).toBe('+84901234567');
  });

  it('keeps valid E.164 numbers and rejects malformed input', () => {
    expect(normalizeVietnamesePhone('+84901234567')).toBe('+84901234567');
    expect(normalizeVietnamesePhone('12345')).toBeNull();
    expect(normalizeVietnamesePhone('+841234')).toBeNull();
  });
});

import { PROFILE_LIMITS, validateAndNormalizeProfileText } from '../src/features/profile/profilePolicy';

describe('profile text policy', () => {
  it('normalizes optional blank values to null for database constraints', () => {
    expect(validateAndNormalizeProfileText({
      displayName: '  An  ',
      homeCity: '   ',
      bio: '',
    })).toEqual({
      value: { displayName: 'An', homeCity: null, bio: null },
      error: null,
    });
  });

  it('rejects a blank display name', () => {
    expect(validateAndNormalizeProfileText({ displayName: ' ', homeCity: '', bio: '' }).error)
      .toBe('Tên hiển thị không được để trống.');
  });

  it.each([
    ['displayName', 'Tên hiển thị', PROFILE_LIMITS.displayName],
    ['homeCity', 'Nơi ở', PROFILE_LIMITS.homeCity],
    ['bio', 'Giới thiệu', PROFILE_LIMITS.bio],
  ] as const)('rejects %s longer than its database limit', (field, label, limit) => {
    const input = { displayName: 'An', homeCity: '', bio: '', [field]: 'a'.repeat(limit + 1) };
    expect(validateAndNormalizeProfileText(input).error).toContain(label);
  });
});

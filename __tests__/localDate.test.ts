import {
  addLocalDays,
  formatLocalDate,
  localDateDifference,
  parseLocalDate,
  todayInTimeZone,
} from '../src/utils/localDate';

describe('local date utilities', () => {
  it('round-trips calendar dates without converting through UTC', () => {
    expect(formatLocalDate(parseLocalDate('2026-08-12'))).toBe('2026-08-12');
  });

  it('rejects impossible and non-canonical dates', () => {
    expect(() => parseLocalDate('2026-02-30')).toThrow('Ngày không hợp lệ.');
    expect(() => parseLocalDate('12/08/2026')).toThrow('YYYY-MM-DD');
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addLocalDays('2024-02-28', 2)).toBe('2024-03-01');
  });

  it('computes whole calendar-day differences', () => {
    expect(localDateDifference('2026-12-31', '2027-01-02')).toBe(2);
  });

  it('uses the requested business timezone near a UTC date boundary', () => {
    const now = new Date('2026-08-11T18:00:00.000Z');
    expect(todayInTimeZone('Asia/Ho_Chi_Minh', now)).toBe('2026-08-12');
  });
});

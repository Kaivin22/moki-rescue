import { canChangeAvailability } from '../src/features/rescue/availabilityPolicy';
import type { ProviderStatus } from '../src/types/rescue';
import { minuteLabel, parseWorkingTime, validWorkingDays } from '../src/features/rescue/workingHours';
import { isLocationFresh } from '../src/features/rescue/services/locationPolicy';
import {
  isValidProviderAccuracy,
  isValidProviderLocation,
} from '../src/features/rescue/services/locationAccuracy';

const provider: ProviderStatus = {
  available: false,
  status: 'active',
  teamName: 'Test',
  teamRating: { average: null, count: 0 },
  qualityWarningCount: 0,
  suspensionReviewRecommended: false,
  qualityNotice: null,
  teamStatus: 'verified',
  shopLatitude: 16.061,
  shopLongitude: 108.2238,
  shopInServiceArea: true,
  shopAddress: 'Test shop address',
  hoursConfigured: true,
  receivingPaused: false,
  receivingUntil: '2099-01-01T14:00:00Z',
  availabilityUntil: null,
};
const ready = { loaded: true, failed: false, busy: false, provider, hasActiveRequest: false };
describe('provider availability control', () => {
  it('allows an eligible idle provider to go online', () => expect(canChangeAvailability(ready)).toBe(true));
  it.each([
    { loaded: false },
    { failed: true },
    { busy: true },
    { provider: undefined },
    { provider: { ...provider, status: 'suspended' } },
    { provider: { ...provider, status: 'pending' } },
    { provider: { ...provider, status: 'rejected' } },
    { provider: { ...provider, teamStatus: 'pending' as const } },
    { provider: { ...provider, shopInServiceArea: false } },
    { provider: { ...provider, hoursConfigured: false } },
    { provider: { ...provider, receivingPaused: true } },
    { provider: { ...provider, receivingUntil: null } },
    { hasActiveRequest: true },
  ])('blocks unsafe or misleading changes: %j', (state) =>
    expect(canChangeAvailability({ ...ready, ...state })).toBe(false),
  );
  it('still allows going offline when busy with a case', () =>
    expect(
      canChangeAvailability({ ...ready, provider: { ...provider, available: true }, hasActiveRequest: true }),
    ).toBe(true));
  it('does not trust stale cached online status after a load error', () =>
    expect(
      canChangeAvailability({ ...ready, failed: true, provider: { ...provider, available: true } }),
    ).toBe(false));
});

describe('shop receiving hours input', () => {
  it('parses 24-hour input and treats closing midnight as 24:00', () => {
    expect(parseWorkingTime('07:30')).toBe(450);
    expect(parseWorkingTime('00:00')).toBe(0);
    expect(parseWorkingTime('00:00', true)).toBe(1440);
    expect(parseWorkingTime('24:00', true)).toBe(1440);
    expect(minuteLabel(1440)).toBe('24:00');
    expect(minuteLabel(65)).toBe('01:05');
  });
  it.each(['24:00', '24:01', '25:00', '7:30', '07:60', '', 'NaN'])(
    'rejects invalid opening time %s',
    (value) => {
      expect(parseWorkingTime(value)).toBeNull();
    },
  );
  it('allows closed, daily, overnight and explicit 24/7 schedules', () => {
    expect(validWorkingDays([])).toBe(true);
    expect(validWorkingDays([{ dayOfWeek: 1, opensMinute: 420, closesMinute: 1260 }])).toBe(true);
    expect(
      validWorkingDays([
        { dayOfWeek: 7, opensMinute: 1320, closesMinute: 360 },
        { dayOfWeek: 1, opensMinute: 360, closesMinute: 600 },
      ]),
    ).toBe(true);
    expect(
      validWorkingDays(
        Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, opensMinute: 0, closesMinute: 1440 })),
      ),
    ).toBe(true);
  });
  it('rejects overlaps including Sunday night into Monday morning', () => {
    for (const dayOfWeek of [1, 7]) {
      expect(
        validWorkingDays([
          { dayOfWeek, opensMinute: 1320, closesMinute: 360 },
          { dayOfWeek: (dayOfWeek % 7) + 1, opensMinute: 359, closesMinute: 600 },
        ]),
      ).toBe(false);
    }
  });
  it('rejects duplicates, empty shifts, out-of-range and fractional values', () => {
    const day = { dayOfWeek: 1, opensMinute: 420, closesMinute: 1260 };
    expect(validWorkingDays([day, day])).toBe(false);
    for (const change of [
      { dayOfWeek: 0 },
      { dayOfWeek: 8 },
      { opensMinute: -1 },
      { opensMinute: 1440 },
      { opensMinute: 1.5 },
      { closesMinute: 0 },
      { closesMinute: 1441 },
      { closesMinute: 420 },
    ]) {
      expect(validWorkingDays([{ ...day, ...change }])).toBe(false);
    }
  });
});

describe('provider location outbox retention', () => {
  const now = Date.parse('2026-08-16T10:00:00.000Z');

  it('retries only recent checkpoints', () => {
    expect(isLocationFresh('2026-08-16T09:59:00.000Z', now)).toBe(true);
    expect(isLocationFresh('2026-08-16T09:57:00.000Z', now)).toBe(false);
  });

  it('discards invalid and future timestamps', () => {
    expect(isLocationFresh('invalid', now)).toBe(false);
    expect(isLocationFresh('2026-08-16T10:01:00.000Z', now)).toBe(false);
  });
});

describe('provider GPS accuracy contract', () => {
  it('requires a finite accuracy value from the operating system', () => {
    expect(isValidProviderAccuracy(25)).toBe(true);
    expect(isValidProviderAccuracy(null)).toBe(false);
    expect(isValidProviderAccuracy(Number.NaN)).toBe(false);
    expect(isValidProviderAccuracy(1001)).toBe(false);
  });

  it('rejects incomplete location payloads before queue or realtime use', () => {
    expect(
      isValidProviderLocation({
        latitude: 16.05,
        longitude: 108.2,
        accuracyM: 18,
        recordedAt: '2026-08-16T10:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      isValidProviderLocation({
        latitude: 16.05,
        longitude: 108.2,
        accuracyM: null,
        recordedAt: '2026-08-16T10:00:00.000Z',
      }),
    ).toBe(false);
  });
});

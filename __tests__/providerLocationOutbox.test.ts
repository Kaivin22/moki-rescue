import { isLocationFresh } from '../src/features/rescue/services/locationPolicy';
import {
  isValidProviderAccuracy,
  isValidProviderLocation,
} from '../src/features/rescue/services/locationAccuracy';

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

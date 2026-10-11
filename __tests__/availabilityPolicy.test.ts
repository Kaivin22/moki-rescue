import { canChangeAvailability } from '../src/features/rescue/availabilityPolicy';
import type { ProviderStatus } from '../src/types/rescue';

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

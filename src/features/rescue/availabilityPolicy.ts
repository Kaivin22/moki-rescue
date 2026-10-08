import type { ProviderStatus } from '@/src/types/rescue';

// The server remains authoritative. These checks prevent misleading UI actions.
export function canChangeAvailability(input: {
  loaded: boolean;
  failed: boolean;
  busy: boolean;
  provider?: ProviderStatus;
  hasActiveRequest: boolean;
}): boolean {
  if (!input.loaded || input.failed || input.busy || !input.provider) return false;
  if (input.provider.available) return true;
  return (
    input.provider.status === 'active' &&
    input.provider.teamStatus === 'verified' &&
    input.provider.shopInServiceArea &&
    !input.hasActiveRequest
  );
}

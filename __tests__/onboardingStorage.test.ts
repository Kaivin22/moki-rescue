import { ONBOARDING_STORAGE_KEY } from '../src/features/onboarding/onboardingStorage';

describe('onboarding storage', () => {
  it('uses a domain-specific versioned key', () => {
    expect(ONBOARDING_STORAGE_KEY).toBe('motorescue:onboarding:completed:v1');
  });
});

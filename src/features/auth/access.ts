import { useAuthStore } from '@/src/stores/authStore';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import type { Profile } from '@/src/types/profile';

export function hasCurrentConsent(profile: Profile | null): boolean {
  return Boolean(profile?.terms_accepted_at && profile.terms_version === LEGAL_VERSION);
}

export function useHasAppAccess(): boolean {
  return useAuthStore((state) =>
    Boolean(state.user && state.profile?.is_active && hasCurrentConsent(state.profile)),
  );
}

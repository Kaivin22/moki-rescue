export const PROFILE_LIMITS = {
  displayName: 80,
  homeCity: 120,
  bio: 500,
} as const;

export interface ProfileTextInput {
  displayName: string;
  homeCity: string;
  bio: string;
}
export interface NormalizedProfileText {
  displayName: string;
  homeCity: string | null;
  bio: string | null;
}

export function validateAndNormalizeProfileText(
  input: ProfileTextInput,
): { value: NormalizedProfileText; error: null } | { value: null; error: string } {
  const displayName = input.displayName.trim();
  const homeCity = input.homeCity.trim();
  const bio = input.bio.trim();

  if (!displayName) {
    return { value: null, error: 'Tên hiển thị không được để trống.' };
  }
  if (displayName.length > PROFILE_LIMITS.displayName) {
    return { value: null, error: `Tên hiển thị không được quá ${PROFILE_LIMITS.displayName} ký tự.` };
  }
  if (homeCity.length > PROFILE_LIMITS.homeCity) {
    return { value: null, error: `Nơi ở không được quá ${PROFILE_LIMITS.homeCity} ký tự.` };
  }
  if (bio.length > PROFILE_LIMITS.bio) {
    return { value: null, error: `Giới thiệu không được quá ${PROFILE_LIMITS.bio} ký tự.` };
  }

  return {
    value: {
      displayName,
      homeCity: homeCity || null,
      bio: bio || null,
    },
    error: null,
  };
}

import type { Language } from '@/src/i18n';
import type { ProfileRole } from '@/src/types/profile';

const ROLE_LABELS: Record<Language, Record<ProfileRole, string>> = {
  vi: {
    customer: 'Khách hàng',
    provider: 'Cứu hộ viên đã xác minh',
    dispatcher: 'Điều phối viên',
    admin: 'Quản trị vận hành',
  },
  en: {
    customer: 'Customer',
    provider: 'Verified rescue provider',
    dispatcher: 'Dispatcher',
    admin: 'Operations administrator',
  },
};

export function roleLabel(role: ProfileRole, language: Language) {
  return ROLE_LABELS[language][role];
}

export function isStaffRole(role: ProfileRole): boolean {
  return role === 'dispatcher' || role === 'admin';
}

export function hasOperationsRole(role: ProfileRole): boolean {
  return role === 'provider' || isStaffRole(role);
}

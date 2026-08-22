export const EMERGENCY_CONTACTS = [
  { number: '115', icon: 'medical-outline' },
  { number: '114', icon: 'flame-outline' },
  { number: '113', icon: 'shield-outline' },
] as const;

export const MEDICAL_EMERGENCY_NUMBER = EMERGENCY_CONTACTS[0].number;

export function emergencyCallUri(number: string) {
  return `tel:${number}`;
}

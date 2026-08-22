export function normalizeVietnamesePhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, '');
  const international = compact.startsWith('0') ? `+84${compact.slice(1)}` : compact;
  return /^\+84\d{9,10}$/.test(international) ? international : null;
}

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return {
    randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  };
});

import { createUuid } from '../src/utils/uuid';

describe('createUuid', () => {
  it('returns RFC 4122 shaped unique idempotency keys', () => {
    const first = createUuid();
    const second = createUuid();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(second).not.toBe(first);
  });
});

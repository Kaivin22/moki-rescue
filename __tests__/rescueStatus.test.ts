import { canCustomerCancel, isLiveStatus, STATUS_LABELS } from '../src/features/rescue/status';

describe('rescue status policy', () => {
  it('has a user-facing label for all important confirmation states', () => {
    expect(STATUS_LABELS.awaiting_arrival_confirmation).toContain('xác nhận');
    expect(STATUS_LABELS.awaiting_completion).toContain('xác nhận');
  });

  it('does not let customer cancel after work begins', () => {
    expect(canCustomerCancel('en_route')).toBe(true);
    expect(canCustomerCancel('no_provider')).toBe(true);
    expect(canCustomerCancel('needs_dispatch')).toBe(true);
    expect(canCustomerCancel('arrived')).toBe(false);
    expect(canCustomerCancel('repairing')).toBe(false);
    expect(canCustomerCancel('completed')).toBe(false);
  });

  it('treats terminal and no-provider states as non-live', () => {
    expect(isLiveStatus('assigned')).toBe(true);
    expect(isLiveStatus('completed')).toBe(false);
    expect(isLiveStatus('cancelled')).toBe(false);
    expect(isLiveStatus('no_provider')).toBe(false);
  });
});

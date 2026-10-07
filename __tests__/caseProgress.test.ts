import { caseProgress, needsCompletionDecision } from '../src/features/rescue/services/caseProgress';
import type { RequestDetails, RescueStatus } from '../src/types/rescue';

const request = (
  status: RescueStatus,
): Pick<RequestDetails, 'status' | 'version' | 'operatorResolution' | 'attentionCodes'> => ({
  status,
  version: 8,
  attentionCodes: [],
  operatorResolution: null,
});

describe('job lifecycle guidance', () => {
  it('tells the provider to request completion, not declare the job completed', () => {
    expect(caseProgress(request('repairing'), 'provider', 'vi')).toContain('gửi yêu cầu hoàn tất');
    expect(caseProgress(request('transporting'), 'provider', 'vi')).toContain('giao xe đúng điểm');
  });

  it('distinguishes provider waiting from customer action', () => {
    expect(caseProgress(request('awaiting_completion'), 'customer', 'vi')).toContain(
      'xác nhận hoàn tất hoặc báo chưa xong',
    );
    expect(caseProgress(request('awaiting_completion'), 'provider', 'vi')).toContain('không cần gửi lại');
  });

  it('does not turn a timeout into completion', () => {
    const pending = {
      ...request('awaiting_completion'),
      attentionCodes: ['completion_confirmation_overdue'],
    };
    expect(caseProgress(pending, 'customer', 'vi')).toContain('không tự hoàn thành');
    expect(caseProgress(pending, 'admin', 'vi')).toContain('admin cần liên hệ xác minh');
  });

  it('keeps unverified jobs visibly open without exposing staff evidence', () => {
    const pending = {
      ...request('awaiting_completion'),
      operatorResolution: {
        decision: 'unverified' as const,
        note: 'private evidence',
        requestVersion: 8,
        createdAt: '2026-09-29T00:00:00Z',
      },
    };
    expect(caseProgress(pending, 'provider', 'vi')).toContain('Ca vẫn mở');
    expect(caseProgress(pending, 'customer', 'vi')).not.toContain('private evidence');
    expect(caseProgress({ ...pending, version: 9 }, 'customer', 'vi')).not.toContain('Admin chưa xác minh');
  });

  it('explains availability after both completed and cancelled jobs', () => {
    for (const status of ['completed', 'cancelled'] as const) {
      expect(caseProgress(request(status), 'provider', 'vi')).toContain('Bật hoạt động trở lại');
      expect(caseProgress(request(status), 'customer', 'vi')).not.toContain('Bật hoạt động');
    }
    expect(caseProgress(request('cancelled'), 'admin', 'vi')).toContain('không được tính là ca hoàn thành');
  });

  it('labels admin verified completion explicitly', () => {
    expect(
      caseProgress(
        {
          ...request('completed'),
          operatorResolution: {
            decision: 'verified_completed',
            note: null,
            requestVersion: 8,
            createdAt: '',
          },
        },
        'customer',
        'vi',
      ),
    ).toContain('do admin xác minh');
  });

  it('does not allow closing completion alerts while a job remains active', () => {
    expect(needsCompletionDecision('completion_confirmation_overdue', 'awaiting_completion')).toBe(true);
    expect(needsCompletionDecision('completion_dispute', 'repairing')).toBe(true);
    expect(needsCompletionDecision('completion_dispute', 'cancelled')).toBe(false);
    expect(needsCompletionDecision('customer_incident_reported', 'completed')).toBe(false);
  });

  it('supports English for all job statuses', () => {
    const statuses: RescueStatus[] = [
      'searching',
      'offered',
      'assigned',
      'en_route',
      'awaiting_arrival_confirmation',
      'arrived',
      'diagnosing',
      'awaiting_quote',
      'quote_approved',
      'repairing',
      'transporting',
      'awaiting_completion',
      'needs_dispatch',
      'no_provider',
      'completed',
      'cancelled',
    ];
    for (const status of statuses)
      expect(caseProgress(request(status), 'admin', 'en').length).toBeGreaterThan(10);
  });
});

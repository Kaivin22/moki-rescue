import type { RescueStatus } from '@/src/types/rescue';
import { Colors } from '@/src/constants/colors';
import type { Language } from '@/src/i18n';

const STATUS_LABELS_BY_LANGUAGE: Record<Language, Record<RescueStatus, string>> = {
  vi: {
    searching: 'Đang tìm đội phù hợp',
    offered: 'Đã gửi đề nghị cho đội cứu hộ',
    assigned: 'Đã có cứu hộ viên',
    en_route: 'Cứu hộ viên đang đến',
    awaiting_arrival_confirmation: 'Chờ bạn xác nhận đã đến',
    arrived: 'Đã xác nhận có mặt',
    diagnosing: 'Đang kiểm tra xe',
    awaiting_quote: 'Chờ bạn duyệt báo giá',
    repairing: 'Đang sửa xe',
    transporting: 'Đang vận chuyển xe',
    awaiting_completion: 'Chờ bạn xác nhận hoàn tất',
    completed: 'Đã hoàn tất',
    cancelled: 'Đã hủy',
    no_provider: 'Chưa tìm được đội phù hợp',
  },
  en: {
    searching: 'Finding a suitable team',
    offered: 'Offer sent to rescue providers',
    assigned: 'Rescue provider assigned',
    en_route: 'Rescue provider is on the way',
    awaiting_arrival_confirmation: 'Waiting for your arrival confirmation',
    arrived: 'Arrival confirmed',
    diagnosing: 'Inspecting the motorcycle',
    awaiting_quote: 'Waiting for your quote approval',
    repairing: 'Repair in progress',
    transporting: 'Motorcycle transport in progress',
    awaiting_completion: 'Waiting for your completion confirmation',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_provider: 'No suitable team found',
  },
};

// Vietnamese baseline retained for non-UI compatibility and domain tests.
export const STATUS_LABELS = STATUS_LABELS_BY_LANGUAGE.vi;

export function statusLabel(status: RescueStatus, language: Language) {
  return STATUS_LABELS_BY_LANGUAGE[language][status];
}

export function statusColor(status: RescueStatus) {
  if (status === 'completed') return Colors.success;
  if (status === 'cancelled' || status === 'no_provider') return Colors.error;
  if (status.startsWith('awaiting_')) return Colors.warning;
  return Colors.info;
}

export function isLiveStatus(status: RescueStatus) {
  return !['completed', 'cancelled', 'no_provider'].includes(status);
}

export function canCustomerCancel(status: RescueStatus) {
  return [
    'searching',
    'offered',
    'assigned',
    'en_route',
    'awaiting_arrival_confirmation',
    'no_provider',
  ].includes(status);
}

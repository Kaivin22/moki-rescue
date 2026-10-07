import type { Language } from '@/src/i18n';
import type { ProfileRole } from '@/src/types/profile';
import type { RequestDetails, RescueStatus } from '@/src/types/rescue';

const NEXT: Record<RescueStatus, [string, string]> = {
  searching: ['Hệ thống đang tìm đội phù hợp.', 'The system is looking for a suitable team.'],
  offered: [
    'Đang chờ cứu hộ viên phản hồi đề nghị nhận ca.',
    'Waiting for a provider to respond to the offer.',
  ],
  assigned: ['Cứu hộ viên cần bấm bắt đầu di chuyển.', 'The provider needs to start the trip.'],
  en_route: [
    'Cứu hộ viên đến nơi rồi gửi yêu cầu xác nhận có mặt.',
    'The provider must arrive, then request arrival confirmation.',
  ],
  awaiting_arrival_confirmation: [
    'Khách hàng cần xác nhận cứu hộ viên đã đến hoặc báo chưa gặp được.',
    'The customer must confirm arrival or report that the provider has not arrived.',
  ],
  arrived: ['Cứu hộ viên cần bắt đầu kiểm tra xe.', 'The provider needs to start inspecting the vehicle.'],
  diagnosing: [
    'Cứu hộ viên kiểm tra và báo giá nếu dịch vụ yêu cầu; khách xác nhận điểm giao nếu cần vận chuyển.',
    'The provider inspects and quotes when required; the customer selects a destination for transport.',
  ],
  awaiting_quote: [
    'Khách hàng cần duyệt hoặc từ chối báo giá.',
    'The customer needs to approve or reject the quote.',
  ],
  quote_approved: [
    'Cứu hộ viên cần bấm bắt đầu công việc; vận chuyển cần có điểm giao.',
    'The provider needs to start work; transport requires a destination.',
  ],
  repairing: [
    'Cứu hộ viên sửa xong thì gửi yêu cầu hoàn tất. Ca chưa được tính là hoàn thành.',
    'After repair, the provider requests completion. The job is not completed yet.',
  ],
  transporting: [
    'Sau khi giao xe đúng điểm, cứu hộ viên gửi yêu cầu hoàn tất.',
    'After delivering the vehicle to the agreed destination, the provider requests completion.',
  ],
  awaiting_completion: [
    'Khách hàng cần kiểm tra kết quả rồi xác nhận hoàn tất hoặc báo chưa xong. Hết thời gian chờ không tự hoàn thành ca.',
    'The customer must check the result and confirm completion or report unfinished work. A timeout does not complete the job.',
  ],
  needs_dispatch: [
    'Admin cần kiểm tra và điều phối đội thay thế hoặc hủy ca có lý do.',
    'An admin needs to review and reassign the job, or cancel it with a reason.',
  ],
  no_provider: [
    'Chưa có đội nhận. Khách có thể tìm lại hoặc liên hệ hỗ trợ; không tiếp tục chờ tự động.',
    'No provider accepted. The customer can retry or contact support; automatic waiting has stopped.',
  ],
  completed: ['Ca đã hoàn thành và được chuyển vào lịch sử.', 'The completed job is available in history.'],
  cancelled: [
    'Ca đã hủy, không được tính là ca hoàn thành.',
    'The cancelled job does not count as completed.',
  ],
};

export function caseProgress(
  request: Pick<RequestDetails, 'status' | 'version' | 'operatorResolution' | 'attentionCodes'>,
  role: ProfileRole,
  language: Language,
) {
  const en = language === 'en';
  let text = NEXT[request.status][en ? 1 : 0];
  if (request.status === 'awaiting_completion' && role === 'provider') {
    text = en
      ? 'Your completion request has been sent. Wait for the customer to confirm or report unfinished work; do not submit again. Overdue confirmations are flagged for admin review.'
      : 'Đã gửi yêu cầu hoàn tất. Chờ khách xác nhận hoặc báo chưa xong, không cần gửi lại. Quá hạn xác nhận sẽ có cảnh báo cho admin.';
  }
  if (
    request.status === 'awaiting_completion' &&
    request.attentionCodes.includes('completion_confirmation_overdue')
  ) {
    text += en
      ? ' Confirmation is overdue; admin verification is needed.'
      : ' Đã quá hạn xác nhận; admin cần liên hệ xác minh.';
  }
  const resolution = request.operatorResolution;
  if (
    request.status === 'awaiting_completion' &&
    resolution?.decision === 'unverified' &&
    resolution.requestVersion === request.version
  ) {
    text += en
      ? ' Admin has not verified the outcome. The job remains open.'
      : ' Admin chưa xác minh được kết quả. Ca vẫn mở, chưa được tính hoàn thành.';
  }
  if (request.status === 'completed' && resolution?.decision === 'verified_completed') {
    text += en ? ' Completion was verified by an admin.' : ' Kết quả hoàn thành do admin xác minh.';
  }
  if (role === 'provider' && ['completed', 'cancelled'].includes(request.status)) {
    text += en
      ? ' You are released from this job. Enable availability again when ready for another job.'
      : ' Bạn đã kết thúc ca này. Bật hoạt động trở lại khi sẵn sàng nhận ca mới.';
  }
  return text;
}

export function needsCompletionDecision(code: string, status: RescueStatus) {
  return (
    !['completed', 'cancelled'].includes(status) &&
    ['completion_confirmation_overdue', 'completion_dispute'].includes(code)
  );
}

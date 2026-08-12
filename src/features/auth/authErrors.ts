const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_not_confirmed: 'Email chưa được xác thực. Hãy kiểm tra hộp thư của bạn.',
  user_already_exists: 'Email này đã được sử dụng.',
  email_exists: 'Email này đã được sử dụng.',
  weak_password: 'Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.',
  over_request_rate_limit: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  otp_expired: 'Liên kết đã hết hạn. Vui lòng yêu cầu một liên kết mới.',
  validation_failed: 'Thông tin đăng nhập chưa hợp lệ.',
};

export function authErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  return FRIENDLY_AUTH_ERRORS[code] ?? fallback;
}

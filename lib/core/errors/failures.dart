library;

/// Failure types cho Either pattern.
/// Dùng thay cho throw/Exception.
/// Either[Failure, T] cho mọi Future có thể lỗi.

sealed class Failure {
  const Failure(this.message);
  final String message;

  @override
  String toString() => '$runtimeType: $message';
}

// ── Mạng / Kết nối ─────────────────────────────────────
/// Lỗi mất kết nối hoặc timeout
final class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Mất kết nối mạng. Vui lòng thử lại.']);
}

// ── Xác thực ───────────────────────────────────────────
/// Lỗi đăng nhập / token hết hạn / chưa xác thực
final class AuthFailure extends Failure {
  const AuthFailure([
    super.message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  ]);
}

/// Lỗi cụ thể từ Supabase Auth (email sai, mật khẩu sai...)
final class AuthInvalidCredentialsFailure extends Failure {
  const AuthInvalidCredentialsFailure([
    super.message = 'Email hoặc mật khẩu không chính xác.',
  ]);
}

/// Lỗi email đã được sử dụng
final class AuthEmailExistsFailure extends Failure {
  const AuthEmailExistsFailure([
    super.message = 'Email này đã được đăng ký. Vui lòng đăng nhập.',
  ]);
}

// ── Dữ liệu / Server ───────────────────────────────────
/// Lỗi từ phía server (5xx)
final class ServerFailure extends Failure {
  const ServerFailure([
    super.message = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  ]);
}

/// Không tìm thấy dữ liệu (404)
final class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Không tìm thấy dữ liệu.']);
}

/// Dữ liệu trả về không hợp lệ / lỗi parse JSON
final class ParseFailure extends Failure {
  const ParseFailure([super.message = 'Dữ liệu không hợp lệ.']);
}

// ── Quyền / Xác nhận ───────────────────────────────────
/// Người dùng không có quyền thực hiện hành động
final class PermissionFailure extends Failure {
  const PermissionFailure([
    super.message = 'Bạn không có quyền thực hiện thao tác này.',
  ]);
}

/// Dữ liệu đầu vào không hợp lệ (validation)
final class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}

// ── Bộ nhớ cục bộ ──────────────────────────────────────
/// Lỗi đọc/ghi Hive hoặc bộ nhớ cục bộ
final class CacheFailure extends Failure {
  const CacheFailure([
    super.message = 'Lỗi dữ liệu cục bộ. Vui lòng khởi động lại ứng dụng.',
  ]);
}

// ── VIP ────────────────────────────────────────────────
/// Tính năng chỉ dành cho thành viên VIP
final class VipRequiredFailure extends Failure {
  const VipRequiredFailure([
    super.message = 'Tính năng này chỉ dành cho thành viên VIP.',
  ]);
}

// ── AI / Gemini ─────────────────────────────────────────
/// Vượt quá giới hạn tin nhắn AI hàng ngày
final class AiRateLimitFailure extends Failure {
  const AiRateLimitFailure([
    super.message =
        'Bạn đã dùng hết lượt hỏi AI hôm nay. Hãy quay lại vào ngày mai!',
  ]);
}

// ── Không xác định ─────────────────────────────────────
/// Lỗi không thuộc các loại trên
final class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Đã xảy ra lỗi không xác định.']);
}

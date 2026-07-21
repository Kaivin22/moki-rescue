/// ═══════════════════════════════════════════════════════
/// RateLimiter — Giới hạn số lượng request trong khoảng thời gian
///
/// Dùng thuật toán Sliding Window để kiểm soát tần suất gọi AI Chat.
/// Ví dụ: maxRequests=5, window=1 phút → tối đa 5 tin nhắn/phút.
/// ═══════════════════════════════════════════════════════
class RateLimiter {
  RateLimiter({
    required this.maxRequests,
    required this.window,
  });

  /// Số request tối đa trong khoảng [window]
  final int maxRequests;

  /// Khoảng thời gian sliding window
  final Duration window;

  /// Danh sách timestamps các request đã thực hiện
  final List<DateTime> _timestamps = [];

  /// Kiểm tra xem có thể thực hiện request tiếp theo không.
  /// Trả về `true` nếu cho phép, `false` nếu bị giới hạn.
  bool tryAcquire({DateTime? now}) {
    final currentTime = now ?? DateTime.now();
    _evict(currentTime);

    if (_timestamps.length >= maxRequests) {
      return false; // Đã đạt giới hạn
    }

    _timestamps.add(currentTime);
    return true;
  }

  /// Thời gian phải chờ thêm để request tiếp theo được chấp nhận.
  /// Trả về `Duration.zero` nếu có thể request ngay.
  Duration waitTime({DateTime? now}) {
    final currentTime = now ?? DateTime.now();
    _evict(currentTime);

    if (_timestamps.length < maxRequests) {
      return Duration.zero;
    }

    // Thời điểm request cũ nhất sẽ hết hạn
    final oldest = _timestamps.first;
    final expiry = oldest.add(window);
    final remaining = expiry.difference(currentTime);
    return remaining > Duration.zero ? remaining : Duration.zero;
  }

  /// Số request còn có thể thực hiện trong window hiện tại
  int get remaining {
    _evict(DateTime.now());
    final used = _timestamps.length;
    final left = maxRequests - used;
    return left < 0 ? 0 : left;
  }

  /// Reset toàn bộ (dùng trong test hoặc khi logout)
  void reset() => _timestamps.clear();

  /// Xóa các timestamps đã quá window
  void _evict(DateTime now) {
    final cutoff = now.subtract(window);
    _timestamps.removeWhere((ts) => ts.isBefore(cutoff));
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:danang_itinerary/core/utils/rate_limiter.dart';

void main() {
  group('RateLimiter', () {
    late RateLimiter limiter;

    setUp(() {
      // 3 request / 1 phút
      limiter = RateLimiter(
        maxRequests: 3,
        window: const Duration(minutes: 1),
      );
    });

    // ── tryAcquire ──────────────────────────────────────
    test('tryAcquire cho phép request khi chưa đạt giới hạn', () {
      expect(limiter.tryAcquire(), isTrue);
      expect(limiter.tryAcquire(), isTrue);
      expect(limiter.tryAcquire(), isTrue);
    });

    test('tryAcquire chặn request thứ 4 khi giới hạn là 3', () {
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.tryAcquire(), isFalse);
    });

    test('tryAcquire cho phép lại sau khi window trôi qua', () {
      final t0 = DateTime(2025, 1, 1, 10, 0, 0);

      // 3 request trong window đầu
      limiter.tryAcquire(now: t0);
      limiter.tryAcquire(now: t0.add(const Duration(seconds: 10)));
      limiter.tryAcquire(now: t0.add(const Duration(seconds: 20)));
      expect(
          limiter.tryAcquire(now: t0.add(const Duration(seconds: 30))),
          isFalse);

      // Sau 61 giây kể từ t0 → request đầu tiên hết hạn
      final t1 = t0.add(const Duration(seconds: 61));
      expect(limiter.tryAcquire(now: t1), isTrue);
    });

    // ── remaining ──────────────────────────────────────
    test('remaining trả đúng số request còn lại', () {
      expect(limiter.remaining, equals(3));
      limiter.tryAcquire();
      expect(limiter.remaining, equals(2));
      limiter.tryAcquire();
      expect(limiter.remaining, equals(1));
      limiter.tryAcquire();
      expect(limiter.remaining, equals(0));
    });

    // ── waitTime ──────────────────────────────────────
    test('waitTime trả Duration.zero khi còn slot trống', () {
      expect(limiter.waitTime(), equals(Duration.zero));
    });

    test('waitTime trả thời gian chờ khi đạt giới hạn', () {
      final t0 = DateTime(2025, 1, 1, 10, 0, 0);
      limiter.tryAcquire(now: t0);
      limiter.tryAcquire(now: t0.add(const Duration(seconds: 5)));
      limiter.tryAcquire(now: t0.add(const Duration(seconds: 10)));

      // Tại t0 + 30s: phải chờ thêm 30s (window = 60s, oldest = t0)
      final waitAt30 = limiter.waitTime(
          now: t0.add(const Duration(seconds: 30)));
      expect(waitAt30.inSeconds, closeTo(30, 1));
    });

    // ── reset ──────────────────────────────────────────
    test('reset xóa toàn bộ trạng thái', () {
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.tryAcquire(), isFalse);
      limiter.reset();
      expect(limiter.tryAcquire(), isTrue);
      expect(limiter.remaining, equals(2));
    });

    // ── maxRequests = 1 ────────────────────────────────
    test('maxRequests=1 → chỉ 1 request được phép mỗi window', () {
      final strict = RateLimiter(
        maxRequests: 1,
        window: const Duration(seconds: 10),
      );
      expect(strict.tryAcquire(), isTrue);
      expect(strict.tryAcquire(), isFalse);
    });

    // ── Sliding window không chặn quá sớm ──────────────
    test('Sliding window: requests cũ hết hạn đúng lúc', () {
      final t0 = DateTime(2025, 6, 1, 8, 0, 0);
      final singleWindow = RateLimiter(
        maxRequests: 2,
        window: const Duration(seconds: 30),
      );

      singleWindow.tryAcquire(now: t0);               // slot 1
      singleWindow.tryAcquire(now: t0.add(const Duration(seconds: 15))); // slot 2
      expect(singleWindow.tryAcquire(now: t0.add(const Duration(seconds: 20))), isFalse);

      // t0+31s → slot 1 hết hạn, slot 2 vẫn còn
      expect(singleWindow.tryAcquire(now: t0.add(const Duration(seconds: 31))), isTrue);

      // t0+46s → slot 2 hết hạn, có thể request
      expect(singleWindow.tryAcquire(now: t0.add(const Duration(seconds: 46))), isTrue);
    });
  });
}

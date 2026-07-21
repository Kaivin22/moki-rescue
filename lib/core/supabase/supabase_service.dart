import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// ═══════════════════════════════════════════════════════
/// SupabaseService — Singleton khởi tạo kết nối Supabase
///
/// Cách dùng:
///   Gọi `SupabaseService.initialize()` trong `main()`.
///   Truy cập client qua `SupabaseService.client`.
/// ═══════════════════════════════════════════════════════

abstract final class SupabaseService {
  // Ngăn khởi tạo trực tiếp — dùng như namespace tĩnh

  /// Khởi tạo kết nối Supabase từ biến môi trường trong file .env.
  /// Phải được gọi một lần duy nhất trong `main()` trước `runApp()`.
  static Future<void> initialize() async {
    final url = dotenv.env['SUPABASE_URL'] ?? '';
    final anonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

    assert(url.isNotEmpty, 'SUPABASE_URL không được để trống trong file .env');
    assert(
      anonKey.isNotEmpty,
      'SUPABASE_ANON_KEY không được để trống trong file .env',
    );

    await Supabase.initialize(
      url: url,
      publishableKey: anonKey,
      // Bật deep link để nhận callback OAuth từ Google Sign-in
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  /// Truy cập trực tiếp SupabaseClient — dùng trong DataSource.
  static SupabaseClient get client => Supabase.instance.client;

  /// Truy cập nhanh thông tin người dùng đang đăng nhập.
  /// Trả về `null` nếu chưa đăng nhập.
  static User? get currentUser => client.auth.currentUser;

  /// Kiểm tra trạng thái đăng nhập.
  static bool get isAuthenticated => currentUser != null;

  /// Lấy role của user hiện tại từ JWT metadata.
  /// Supabase cho phép set custom claims qua SQL:
  ///   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'
  ///   WHERE id = 'user-id-here';
  /// Fallback về 'user' nếu không có.
  static String get currentUserRole {
    final meta = currentUser?.userMetadata;
    return (meta?['role'] as String?) ?? 'user';
  }

  /// Stream theo dõi thay đổi trạng thái xác thực (login / logout).
  static Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;
}

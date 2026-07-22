import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/failures.dart';
import '../../data/datasources/supabase_auth_datasource.dart';
import '../../domain/models/user_profile.dart';

/// ═══════════════════════════════════════════════════════
/// AuthState — trạng thái xác thực
/// ═══════════════════════════════════════════════════════

sealed class AuthState {
  const AuthState();
}

/// Đang kiểm tra trạng thái ban đầu (splash screen)
final class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Đã đăng nhập — có thông tin user
final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.profile);
  final UserProfile profile;
}

/// Chưa đăng nhập
final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Đang xử lý (loading)
final class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Có lỗi — hiển thị message
final class AuthError extends AuthState {
  const AuthError(this.failure);
  final Failure failure;

  String get message => failure.message;
}

/// ═══════════════════════════════════════════════════════
/// AuthNotifier — StateNotifier quản lý auth flow
/// ═══════════════════════════════════════════════════════

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._dataSource) : super(const AuthInitial()) {
    _checkInitialAuth();
  }

  final SupabaseAuthDataSource _dataSource;

  // ── Khởi tạo: kiểm tra session hiện tại ────────────
  Future<void> _checkInitialAuth() async {
    if (_dataSource.isAuthenticated) {
      final userId = _dataSource.currentUser!.id;
      final (profile, failure) = await _dataSource.fetchProfile(userId);
      if (failure != null) {
        state = const AuthUnauthenticated();
      } else {
        state = AuthAuthenticated(profile!);
      }
    } else {
      state = const AuthUnauthenticated();
    }
  }

  // ── Đăng ký email/password ──────────────────────────
  Future<void> signUpWithEmail({
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = const AuthLoading();
    final (response, failure) = await _dataSource.signUpWithEmail(
      email: email,
      password: password,
      displayName: displayName,
    );
    if (failure != null) {
      state = AuthError(failure);
      return;
    }
    // Supabase gửi email xác nhận → giữ Unauthenticated
    // SplashScreen / App sẽ xử lý tiếp sau khi user xác nhận
    if (response?.user != null && response?.session != null) {
      // Session có ngay (email confirmation tắt trên dashboard)
      final userId = response!.user!.id;
      final (profile, profileFailure) = await _dataSource.fetchProfile(userId);
      if (profileFailure != null || profile == null) {
        state = const AuthUnauthenticated();
      } else {
        state = AuthAuthenticated(profile);
      }
    } else {
      // Cần xác nhận email
      state = const AuthUnauthenticated();
    }
  }

  // ── Đăng nhập email/password ─────────────────────────
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    state = const AuthLoading();
    final (response, failure) = await _dataSource.signInWithEmail(
      email: email,
      password: password,
    );
    if (failure != null) {
      state = AuthError(failure);
      return;
    }
    final userId = response?.user?.id;
    if (userId == null) {
      state = AuthError(const AuthFailure());
      return;
    }
    final (profile, profileFailure) = await _dataSource.fetchProfile(userId);
    if (profileFailure != null || profile == null) {
      state = AuthError(profileFailure ?? const AuthFailure());
    } else {
      state = AuthAuthenticated(profile);
    }
  }

  // ── Google OAuth ─────────────────────────────────────
  Future<void> signInWithGoogle() async {
    state = const AuthLoading();
    final failure = await _dataSource.signInWithGoogle();
    if (failure != null) {
      state = AuthError(failure);
    }
    // Kết quả OAuth sẽ đến qua authStateChanges (app_router.dart)
    // AuthNotifier không cần xử lý callback trực tiếp
  }

  // ── Quên mật khẩu ────────────────────────────────────
  Future<bool> resetPassword(String email) async {
    state = const AuthLoading();
    final failure = await _dataSource.resetPassword(email);
    state = const AuthUnauthenticated();
    return failure == null;
  }

  // ── Đăng xuất ────────────────────────────────────────
  Future<void> signOut() async {
    state = const AuthLoading();
    await _dataSource.signOut();
    state = const AuthUnauthenticated();
  }

  // ── Cập nhật profile ─────────────────────────────────
  Future<bool> updateProfile(Map<String, dynamic> data) async {
    final current = state;
    if (current is! AuthAuthenticated) return false;

    final (updated, failure) = await _dataSource.updateProfile(
      userId: current.profile.id,
      data: data,
    );
    if (failure != null || updated == null) return false;
    state = AuthAuthenticated(updated);
    return true;
  }

  // ── Reload profile từ server ─────────────────────────
  Future<void> reloadProfile() async {
    final userId = _dataSource.currentUser?.id;
    if (userId == null) return;
    final (profile, _) = await _dataSource.fetchProfile(userId);
    if (profile != null) state = AuthAuthenticated(profile);
  }

  // ── Xóa tài khoản ────────────────────────────────────
  Future<bool> deleteAccount() async {
    final current = state;
    if (current is! AuthAuthenticated) return false;
    state = const AuthLoading();
    final failure = await _dataSource.deleteAccount(current.profile.id);
    if (failure != null) {
      state = AuthError(failure);
      return false;
    }
    state = const AuthUnauthenticated();
    return true;
  }

  // ── Xóa lỗi ──────────────────────────────────────────
  void clearError() {
    if (state is AuthError) state = const AuthUnauthenticated();
  }
}

/// ═══════════════════════════════════════════════════════
/// Providers
/// ═══════════════════════════════════════════════════════

/// DataSource provider (singleton)
final authDataSourceProvider = Provider<SupabaseAuthDataSource>((ref) {
  return SupabaseAuthDataSource();
});

/// AuthNotifier provider — dùng trên toàn app
final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((
  ref,
) {
  return AuthNotifier(ref.watch(authDataSourceProvider));
});

/// Convenience provider: lấy UserProfile hiện tại (nullable)
final currentProfileProvider = Provider<UserProfile?>((ref) {
  final state = ref.watch(authNotifierProvider);
  return state is AuthAuthenticated ? state.profile : null;
});

/// Convenience provider: đã đăng nhập hay chưa
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authNotifierProvider) is AuthAuthenticated;
});

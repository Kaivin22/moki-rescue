import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/exception_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/supabase/supabase_service.dart';
import '../../domain/models/user_profile.dart';

/// ═══════════════════════════════════════════════════════
/// SupabaseAuthDataSource
/// Thực thi tất cả tác vụ xác thực với Supabase:
///   - Email/password sign-up & sign-in
///   - Google OAuth PKCE
///   - Reset password
///   - Sign-out
///   - Lấy & cập nhật UserProfile
/// ═══════════════════════════════════════════════════════

class SupabaseAuthDataSource {
  SupabaseAuthDataSource() : _client = SupabaseService.client;

  final SupabaseClient _client;

  // ── Truy cập nhanh ──────────────────────────────────
  User? get currentUser => _client.auth.currentUser;
  bool get isAuthenticated => currentUser != null;

  // ═══════════════════════════════════════════════════
  // AUTH METHODS
  // ═══════════════════════════════════════════════════

  /// Đăng ký bằng email + password
  /// Trả về AuthResponse (user + session)
  Future<(AuthResponse?, Failure?)> signUpWithEmail({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'full_name': displayName.trim()},
      );
      return (response, null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Đăng nhập bằng email + password
  Future<(AuthResponse?, Failure?)> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      return (response, null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Đăng nhập bằng Google OAuth — PKCE flow
  /// Mở browser → nhận callback qua URL scheme
  Future<Failure?> signInWithGoogle() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'com.danang.itinerary://login-callback',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Gửi email đặt lại mật khẩu
  Future<Failure?> resetPassword(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email.trim(),
        redirectTo: 'com.danang.itinerary://reset-password',
      );
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Đăng xuất
  Future<Failure?> signOut() async {
    try {
      await _client.auth.signOut();
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  // ═══════════════════════════════════════════════════
  // PROFILE METHODS
  // ═══════════════════════════════════════════════════

  /// Lấy UserProfile từ bảng public.profiles theo userId
  Future<(UserProfile?, Failure?)> fetchProfile(String userId) async {
    try {
      final data = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
      return (UserProfile.fromJson(data), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Cập nhật profile (displayName, bio, travelStyle, ...)
  Future<(UserProfile?, Failure?)> updateProfile({
    required String userId,
    required Map<String, dynamic> data,
  }) async {
    try {
      final updated = await _client
          .from('profiles')
          .update({...data, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', userId)
          .select()
          .single();
      return (UserProfile.fromJson(updated), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Upload avatar và trả về public URL
  Future<(String?, Failure?)> uploadAvatar({
    required String userId,
    required Uint8List fileBytes,
    required String mimeType,
  }) async {
    try {
      final ext = mimeType.contains('png') ? 'png' : 'jpg';
      final path = 'avatars/$userId/avatar.$ext';

      await _client.storage
          .from('profiles')
          .uploadBinary(
            path,
            fileBytes,
            fileOptions: FileOptions(contentType: mimeType, upsert: true),
          );

      final publicUrl = _client.storage.from('profiles').getPublicUrl(path);
      return (publicUrl, null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Xóa tài khoản (soft-delete: ẩn data)
  Future<Failure?> deleteAccount(String userId) async {
    try {
      // Xóa profile — cascade sẽ xóa itineraries, reviews...
      await _client.from('profiles').delete().eq('id', userId);
      await _client.auth.signOut();
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }
}

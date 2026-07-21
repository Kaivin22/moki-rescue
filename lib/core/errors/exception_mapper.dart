import 'package:supabase_flutter/supabase_flutter.dart';
import 'failures.dart';

/// ═══════════════════════════════════════════════════════
/// ExceptionMapper — chuyển đổi Exception sang Failure
///
/// Cách dùng trong DataSource:
///   try {
///     final data = await supabase.from(...).select();
///     return Right(data);
///   } catch (e) {
///     return Left(ExceptionMapper.map(e));
///   }
/// ═══════════════════════════════════════════════════════

abstract final class ExceptionMapper {
  /// Chuyển bất kỳ Exception nào thành Failure có nghĩa.
  static Failure map(Object error) {
    if (error is AuthException) {
      return _mapAuthException(error);
    }
    if (error is PostgrestException) {
      return _mapPostgrestException(error);
    }
    if (error is StorageException) {
      return ServerFailure(error.message);
    }
    // Lỗi mạng / timeout từ Dio hoặc http package
    final msg = error.toString().toLowerCase();
    if (msg.contains('socketexception') ||
        msg.contains('timeout') ||
        msg.contains('connection')) {
      return const NetworkFailure();
    }
    return UnknownFailure(error.toString());
  }

  static Failure _mapAuthException(AuthException e) {
    final msg = e.message.toLowerCase();
    if (msg.contains('invalid login credentials') ||
        msg.contains('invalid password')) {
      return const AuthInvalidCredentialsFailure();
    }
    if (msg.contains('user already registered') ||
        msg.contains('email already')) {
      return const AuthEmailExistsFailure();
    }
    if (msg.contains('expired') || msg.contains('not authenticated')) {
      return const AuthFailure();
    }
    return AuthFailure(e.message);
  }

  static Failure _mapPostgrestException(PostgrestException e) {
    if (e.code == '42501' || e.code == 'PGRST301') {
      return const PermissionFailure();
    }
    if (e.code == 'PGRST116') {
      return const NotFoundFailure();
    }
    return ServerFailure(e.message);
  }
}

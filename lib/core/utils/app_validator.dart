import 'package:flutter/material.dart';

/// ═══════════════════════════════════════════════════════
/// AppValidator — các hàm validate input form
///
/// Cách dùng trong TextFormField:
///   validator: AppValidator.email,
///   validator: AppValidator.required('Tên'),
/// ═══════════════════════════════════════════════════════

abstract final class AppValidator {
  /// Không được để trống
  static FormFieldValidator<String> required(String fieldName) =>
      (value) => (value == null || value.trim().isEmpty)
      ? '$fieldName không được để trống.'
      : null;

  /// Email hợp lệ
  static String? email(String? value) {
    if (value == null || value.trim().isEmpty)
      return 'Email không được để trống.';
    final regex = RegExp(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$');
    if (!regex.hasMatch(value.trim())) return 'Email không hợp lệ.';
    return null;
  }

  /// Mật khẩu ít nhất 6 ký tự
  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Mật khẩu không được để trống.';
    if (value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    return null;
  }

  /// Xác nhận mật khẩu khớp
  static FormFieldValidator<String> confirmPassword(String original) =>
      (value) => (value != original) ? 'Mật khẩu xác nhận không khớp.' : null;

  /// Tên hiển thị: 2–50 ký tự
  static String? displayName(String? value) {
    if (value == null || value.trim().isEmpty)
      return 'Tên hiển thị không được để trống.';
    if (value.trim().length < 2) return 'Tên hiển thị phải có ít nhất 2 ký tự.';
    if (value.trim().length > 50)
      return 'Tên hiển thị không được vượt quá 50 ký tự.';
    return null;
  }

  /// Số điện thoại Việt Nam (10 chữ số, bắt đầu 0)
  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) return null; // phone là optional
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (!RegExp(r'^0[3-9]\d{8}$').hasMatch(digits)) {
      return 'Số điện thoại không hợp lệ (VD: 0901234567).';
    }
    return null;
  }

  /// Tiêu đề không vượt quá [maxLength] ký tự
  static FormFieldValidator<String> maxLength(
    int maxLength, [
    String? fieldName,
  ]) =>
      (value) => (value != null && value.length > maxLength)
      ? '${fieldName ?? 'Nội dung'} không được vượt quá $maxLength ký tự.'
      : null;

  /// Kết hợp nhiều validator, trả lỗi đầu tiên phát hiện được
  static FormFieldValidator<String> compose(
    List<FormFieldValidator<String>> validators,
  ) => (value) {
    for (final v in validators) {
      final error = v(value);
      if (error != null) return error;
    }
    return null;
  };
}

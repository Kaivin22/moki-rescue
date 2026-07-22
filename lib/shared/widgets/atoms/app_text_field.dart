import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// C-02: AppTextField
/// Variants: default | with-prefix | with-suffix | password | multiline
/// States: default | focused | filled | error | disabled
/// WCAG: label always visible, contrast ≥ 4.5:1
/// ═══════════════════════════════════════════════════════

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.errorText,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
    this.readOnly = false,
    this.autofocus = false,
    this.focusNode,
    this.onTap,
  });

  /// Label hiển thị phía trên field (luôn visible — WCAG)
  final String? label;

  /// Placeholder text bên trong field
  final String? hint;

  /// Controller cho TextField
  final TextEditingController? controller;

  /// Icon bên trái (email, phone, search, etc.)
  final Widget? prefixIcon;

  /// Icon bên phải (clear, calendar, etc.)
  final Widget? suffixIcon;

  /// Password mode — hiện eye toggle tự động
  final bool obscureText;

  /// Error message — hiển thị border đỏ + text error
  final String? errorText;

  /// Số dòng: 1 = single-line, >1 = multiline
  final int maxLines;

  /// Giới hạn ký tự (hiển thị counter nếu set)
  final int? maxLength;

  /// Loại bàn phím
  final TextInputType? keyboardType;

  /// Action button trên bàn phím
  final TextInputAction? textInputAction;

  /// Callback khi text thay đổi
  final ValueChanged<String>? onChanged;

  /// Callback khi submit
  final ValueChanged<String>? onSubmitted;

  /// Cho phép chỉnh sửa
  final bool enabled;

  /// Chỉ đọc (clickable nhưng không edit)
  final bool readOnly;

  /// Tự động focus khi mount
  final bool autofocus;

  /// Focus node bên ngoài
  final FocusNode? focusNode;

  /// Callback khi tap (dùng cho date picker, etc.)
  final VoidCallback? onTap;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  /// Toggle hiển thị mật khẩu
  late bool _isObscured;

  @override
  void initState() {
    super.initState();
    _isObscured = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label luôn hiển thị phía trên (WCAG — không chỉ placeholder)
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: AppSpacing.space2),
        ],

        // TextField chính
        TextField(
          controller: widget.controller,
          obscureText: _isObscured,
          maxLines: widget.obscureText ? 1 : widget.maxLines,
          maxLength: widget.maxLength,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          enabled: widget.enabled,
          readOnly: widget.readOnly,
          autofocus: widget.autofocus,
          focusNode: widget.focusNode,
          onTap: widget.onTap,
          style: AppTextStyles.bodyMd.copyWith(
            color: widget.enabled
                ? AppColors.textPrimary
                : AppColors.textPlaceholder,
          ),
          decoration: InputDecoration(
            hintText: widget.hint,
            errorText: widget.errorText,
            prefixIcon: widget.prefixIcon,
            // Suffix: eye toggle cho password, hoặc custom suffix
            suffixIcon: _buildSuffixIcon(),
            // Counter style cho maxLength
            counterStyle: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  /// Suffix icon: eye toggle nếu password, hoặc custom
  Widget? _buildSuffixIcon() {
    if (widget.obscureText) {
      return IconButton(
        icon: Icon(
          _isObscured
              ? Icons.visibility_off_outlined
              : Icons.visibility_outlined,
          color: AppColors.textSecondary,
          size: 20,
        ),
        onPressed: () => setState(() => _isObscured = !_isObscured),
        tooltip: _isObscured ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
      );
    }
    return widget.suffixIcon;
  }
}

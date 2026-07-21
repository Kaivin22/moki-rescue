import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-01: AppButton
/// Variants: primary | secondary | text | icon | loading | disabled
/// States: default | hovered | pressed | focused | disabled | loading
/// Touch target: 52px (WCAG 2.5.5)
/// ═══════════════════════════════════════════════════════

/// Loại button
enum AppButtonVariant { primary, secondary, text }

/// Button chính của app — token-driven, WCAG 2.2 AA
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.isExpanded = true,
    this.prefixIcon,
    this.suffixIcon,
    this.height,
  });

  /// Text hiển thị trên button
  final String label;

  /// Callback khi tap. Null = disabled state.
  final VoidCallback? onPressed;

  /// Loại button: primary (amber), secondary (olive outlined), text
  final AppButtonVariant variant;

  /// Hiển thị loading spinner thay vì label
  final bool isLoading;

  /// Full-width (true) hoặc wrap-content (false)
  final bool isExpanded;

  /// Icon bên trái label
  final Widget? prefixIcon;

  /// Icon bên phải label
  final Widget? suffixIcon;

  /// Override chiều cao (mặc định 52px)
  final double? height;

  /// Callback thực tế — null nếu loading hoặc disabled
  VoidCallback? get _effectiveOnPressed =>
      isLoading ? null : onPressed;

  @override
  Widget build(BuildContext context) {
    final buttonHeight = height ?? AppSizes.buttonHeight;

    // Nội dung bên trong button
    final child = isLoading ? _buildLoadingContent() : _buildLabelContent();

    // Kích thước: full-width hoặc wrap-content
    final minimumSize = isExpanded
        ? Size(double.infinity, buttonHeight)
        : Size(0, buttonHeight);

    switch (variant) {
      case AppButtonVariant.primary:
        return _buildPrimaryButton(child, minimumSize);
      case AppButtonVariant.secondary:
        return _buildSecondaryButton(child, minimumSize);
      case AppButtonVariant.text:
        return _buildTextButton(child, minimumSize);
    }
  }

  /// Primary CTA — amber background, dark text, amber glow shadow
  Widget _buildPrimaryButton(Widget child, Size minimumSize) {
    return Container(
      decoration: BoxDecoration(
        boxShadow: _effectiveOnPressed != null ? AppShadows.amber : AppShadows.none,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: ElevatedButton(
        onPressed: _effectiveOnPressed,
        style: ElevatedButton.styleFrom(
          minimumSize: minimumSize,
        ),
        child: child,
      ),
    );
  }

  /// Secondary — olive outlined, transparent background
  Widget _buildSecondaryButton(Widget child, Size minimumSize) {
    return OutlinedButton(
      onPressed: _effectiveOnPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: minimumSize,
      ),
      child: child,
    );
  }

  /// Text button — no background, olive text
  Widget _buildTextButton(Widget child, Size minimumSize) {
    return TextButton(
      onPressed: _effectiveOnPressed,
      style: TextButton.styleFrom(
        minimumSize: minimumSize,
      ),
      child: child,
    );
  }

  /// Loading spinner — cùng kích thước với text
  Widget _buildLoadingContent() {
    return SizedBox(
      height: 20,
      width: 20,
      child: CircularProgressIndicator.adaptive(
        strokeWidth: 2.5,
        valueColor: AlwaysStoppedAnimation<Color>(
          variant == AppButtonVariant.primary
              ? ButtonTokens.primaryText
              : ButtonTokens.secondaryText,
        ),
      ),
    );
  }

  /// Label với optional prefix/suffix icons
  Widget _buildLabelContent() {
    if (prefixIcon == null && suffixIcon == null) {
      return Text(label);
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (prefixIcon != null) ...[
          prefixIcon!,
          const SizedBox(width: AppSpacing.space2),
        ],
        Flexible(child: Text(label)),
        if (suffixIcon != null) ...[
          const SizedBox(width: AppSpacing.space2),
          suffixIcon!,
        ],
      ],
    );
  }
}

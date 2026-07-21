import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-22: SearchBarWidget
/// 52px height, pill shape, shadow.sm
/// Left: magnify icon olive | Right: filter icon olive
/// ═══════════════════════════════════════════════════════

class SearchBarWidget extends StatelessWidget {
  const SearchBarWidget({
    super.key,
    this.hint = 'Tìm kiếm địa điểm...',
    this.onTap,
    this.onChanged,
    this.onFilterTap,
    this.controller,
    this.autofocus = false,
    this.readOnly = false,
    this.showFilter = true,
  });

  /// Placeholder text
  final String hint;

  /// Callback khi tap (dùng cho search bar không editable)
  final VoidCallback? onTap;

  /// Callback khi text thay đổi
  final ValueChanged<String>? onChanged;

  /// Callback khi tap nút filter
  final VoidCallback? onFilterTap;

  /// Text controller
  final TextEditingController? controller;

  /// Tự động focus khi mount
  final bool autofocus;

  /// Chỉ đọc (tap để navigate sang trang search)
  final bool readOnly;

  /// Hiển thị nút filter
  final bool showFilter;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: readOnly ? onTap : null,
      child: Container(
        height: AppSizes.buttonHeight,
        decoration: BoxDecoration(
          color: CardTokens.bg,
          borderRadius: AppRadius.buttonBorder,
          border: Border.all(
            color: CardTokens.border,
            width: AppBorderWidth.thin,
          ),
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            // ── Magnify icon ──
            const Padding(
              padding: EdgeInsets.only(left: AppSpacing.space4),
              child: Icon(
                Icons.search_rounded,
                size: 22,
                color: AppColors.actionSecondary,
              ),
            ),

            const SizedBox(width: AppSpacing.space3),

            // ── Text field hoặc hint text ──
            Expanded(
              child: readOnly
                  ? Text(
                      hint,
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textPlaceholder,
                      ),
                    )
                  : TextField(
                      controller: controller,
                      autofocus: autofocus,
                      onChanged: onChanged,
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: hint,
                        hintStyle: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textPlaceholder,
                        ),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                    ),
            ),

            // ── Filter icon ──
            if (showFilter)
              GestureDetector(
                onTap: onFilterTap,
                child: const Padding(
                  padding: EdgeInsets.only(right: AppSpacing.space4),
                  child: Icon(
                    Icons.tune_rounded,
                    size: 22,
                    color: AppColors.actionSecondary,
                  ),
                ),
              )
            else
              const SizedBox(width: AppSpacing.space4),
          ],
        ),
      ),
    );
  }
}

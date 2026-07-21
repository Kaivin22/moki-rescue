import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// C-18: SectionHeader
/// Row: title 18sp SemiBold + "Xem tất cả →" TextButton
/// ═══════════════════════════════════════════════════════

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.onViewAll,
    this.actionLabel = 'Xem tất cả',
    this.padding,
  });

  /// Tiêu đề section
  final String title;

  /// Callback khi tap "Xem tất cả". Null = ẩn link.
  final VoidCallback? onViewAll;

  /// Label cho action button (mặc định "Xem tất cả")
  final String actionLabel;

  /// Padding tùy chỉnh
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: Row(
        children: [
          // Tiêu đề
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),

          // "Xem tất cả →" link
          if (onViewAll != null)
            GestureDetector(
              onTap: onViewAll,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    actionLabel,
                    style: AppTextStyles.bodySm.copyWith(
                      color: AppColors.textLink,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space1),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    size: 14,
                    color: AppColors.textLink,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

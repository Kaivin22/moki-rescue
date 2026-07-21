import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-03: TagChip
/// Variants: selectable | display-only | category | filter
/// Selected: olive fill + checkmark (WCAG: không chỉ dùng màu)
/// ═══════════════════════════════════════════════════════

/// Loại chip
enum TagChipVariant { selectable, displayOnly, category, filter }

/// Chip/Tag widget — pill shape, token-driven
class TagChip extends StatelessWidget {
  const TagChip({
    super.key,
    required this.label,
    this.variant = TagChipVariant.selectable,
    this.isSelected = false,
    this.onTap,
    this.leading,
    this.onDeleted,
  });

  /// Text hiển thị
  final String label;

  /// Loại chip
  final TagChipVariant variant;

  /// Trạng thái selected (cho selectable/filter)
  final bool isSelected;

  /// Callback khi tap
  final VoidCallback? onTap;

  /// Widget bên trái (emoji, icon)
  final Widget? leading;

  /// Callback khi xóa (hiện nút ×)
  final VoidCallback? onDeleted;

  @override
  Widget build(BuildContext context) {
    final bool interactive = variant == TagChipVariant.selectable ||
        variant == TagChipVariant.filter;

    return GestureDetector(
      onTap: interactive ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        height: AppSizes.chipHeight,
        padding: EdgeInsets.symmetric(
          horizontal: AppSpacing.space3,
          vertical: AppSpacing.space1,
        ),
        decoration: BoxDecoration(
          color: _backgroundColor,
          borderRadius: AppRadius.chipBorder,
          border: Border.all(
            color: _borderColor,
            width: isSelected ? AppBorderWidth.medium : AppBorderWidth.thin,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Checkmark cho selected state (WCAG: không chỉ dùng màu)
            if (isSelected && interactive) ...[
              Icon(
                Icons.check_rounded,
                size: 14,
                color: _textColor,
              ),
              const SizedBox(width: AppSpacing.space1),
            ],

            // Leading widget (emoji, category icon)
            if (leading != null) ...[
              leading!,
              const SizedBox(width: AppSpacing.space1),
            ],

            // Label text
            Flexible(
              child: Text(
                label,
                style: AppTextStyles.bodySm.copyWith(
                  color: _textColor,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),

            // Nút xóa (×)
            if (onDeleted != null) ...[
              const SizedBox(width: AppSpacing.space1),
              GestureDetector(
                onTap: onDeleted,
                child: Icon(
                  Icons.close_rounded,
                  size: 14,
                  color: _textColor,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Màu nền theo trạng thái
  Color get _backgroundColor {
    if (isSelected) return ChipTokens.selectedBg;
    if (variant == TagChipVariant.category) {
      return AppColors.backgroundOliveTint;
    }
    return ChipTokens.unselectedBg;
  }

  /// Màu border
  Color get _borderColor {
    if (isSelected) return ChipTokens.selectedBg;
    return ChipTokens.unselectedBorder;
  }

  /// Màu text — WCAG fix: dark text trên olive background
  Color get _textColor {
    if (isSelected) return ChipTokens.selectedText;
    if (variant == TagChipVariant.category) {
      return AppColors.actionSecondary;
    }
    return ChipTokens.unselectedText;
  }
}

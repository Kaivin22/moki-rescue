import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-06: StatusBadge
/// Variants: open | closed | vip | free | pending | resolved |
///           inProgress | draft | published
/// Pill shape, 24px height, color + text + optional icon
/// ═══════════════════════════════════════════════════════

/// Loại trạng thái badge
enum StatusType {
  open,
  closed,
  vip,
  free,
  pending,
  resolved,
  inProgress,
  draft,
  published,
}

/// Badge hiển thị trạng thái — pill shape, nhỏ gọn
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.type,
    this.label,
  });

  /// Loại trạng thái
  final StatusType type;

  /// Override label (mặc định dùng label chuẩn)
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space2,
        vertical: AppSpacing.space1,
      ),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: _borderColor != null
            ? Border.all(color: _borderColor!, width: AppBorderWidth.thin)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon (nếu có)
          if (_icon != null) ...[
            Icon(_icon, size: 12, color: _textColor),
            const SizedBox(width: AppSpacing.space1),
          ],
          // Label text
          Text(
            label ?? _defaultLabel,
            style: AppTextStyles.label.copyWith(
              color: _textColor,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  /// Label mặc định theo type
  String get _defaultLabel => switch (type) {
    StatusType.open       => 'Đang mở',
    StatusType.closed     => 'Đóng cửa',
    StatusType.vip        => 'VIP',
    StatusType.free       => 'Miễn phí',
    StatusType.pending    => 'Chờ xử lý',
    StatusType.resolved   => 'Đã giải quyết',
    StatusType.inProgress => 'Đang xử lý',
    StatusType.draft      => 'Bản nháp',
    StatusType.published  => 'Đã chia sẻ',
  };

  /// Màu nền
  Color get _backgroundColor => switch (type) {
    StatusType.open       => AppColors.statusSuccess.withValues(alpha: 0.12),
    StatusType.closed     => AppColors.statusError.withValues(alpha: 0.12),
    StatusType.vip        => AppColors.actionPrimary,
    StatusType.free       => AppColors.statusSuccess.withValues(alpha: 0.12),
    StatusType.pending    => AppColors.statusWarning.withValues(alpha: 0.12),
    StatusType.resolved   => AppColors.statusSuccess.withValues(alpha: 0.12),
    StatusType.inProgress => AppColors.actionSecondary.withValues(alpha: 0.12),
    StatusType.draft      => AppColors.backgroundSecondary,
    StatusType.published  => AppColors.actionSecondary.withValues(alpha: 0.12),
  };

  /// Màu text
  Color get _textColor => switch (type) {
    StatusType.open       => StatusPalette.green500,
    StatusType.closed     => AppColors.statusError,
    StatusType.vip        => AppColors.textOnPrimary,
    StatusType.free       => StatusPalette.green500,
    StatusType.pending    => AmberPalette.amber600,
    StatusType.resolved   => StatusPalette.green500,
    StatusType.inProgress => OlivePalette.olive600,
    StatusType.draft      => AppColors.textSecondary,
    StatusType.published  => OlivePalette.olive600,
  };

  /// Icon (nullable)
  IconData? get _icon => switch (type) {
    StatusType.open       => Icons.check_circle_outline_rounded,
    StatusType.closed     => Icons.cancel_outlined,
    StatusType.vip        => Icons.star_rounded,
    StatusType.free       => null,
    StatusType.pending    => Icons.access_time_rounded,
    StatusType.resolved   => Icons.check_circle_rounded,
    StatusType.inProgress => Icons.sync_rounded,
    StatusType.draft      => Icons.edit_outlined,
    StatusType.published  => Icons.public_rounded,
  };

  /// Border color (nullable — chỉ cho một số variant)
  Color? get _borderColor => switch (type) {
    StatusType.draft => AppColors.borderDefault,
    _ => null,
  };
}

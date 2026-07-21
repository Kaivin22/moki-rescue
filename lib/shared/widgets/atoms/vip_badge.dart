import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';


/// ═══════════════════════════════════════════════════════
/// VIPBadge — Huy hiệu VIP hiển thị trạng thái thành viên
///
/// Biến thể:
///   VIPBadge()           — badge ngang đầy đủ (icon + text)
///   VIPBadge.compact()   — badge nhỏ gọn chỉ có icon
///   VIPBadge.expired()   — badge VIP đã hết hạn (xám)
///
/// Cách dùng:
///   VIPBadge()
///   VIPBadge.compact()
///   VIPBadge(expiresAt: user.vipExpiresAt)
/// ═══════════════════════════════════════════════════════

class VIPBadge extends StatelessWidget {
  const VIPBadge({
    super.key,
    this.expiresAt,
    this.compact = false,
    this.expired = false,
  });

  /// Constructor badge nhỏ gọn (chỉ icon + "VIP")
  const VIPBadge.compact({super.key})
      : compact = true,
        expired = false,
        expiresAt = null;

  /// Constructor badge đã hết hạn (màu xám)
  const VIPBadge.expired({super.key})
      : expired = true,
        compact = false,
        expiresAt = null;

  /// Ngày hết hạn VIP (hiển thị nếu không null và không compact)
  final DateTime? expiresAt;

  /// Chế độ nhỏ gọn — chỉ icon + "VIP"
  final bool compact;

  /// Trạng thái hết hạn — màu xám
  final bool expired;

  bool get _isExpired =>
      expired ||
      (expiresAt != null && expiresAt!.isBefore(DateTime.now()));

  @override
  Widget build(BuildContext context) {
    if (compact) return _buildCompact();
    if (_isExpired) return _buildExpired();
    return _buildFull();
  }

  // ── Badge đầy đủ: gradient vàng + icon vương miện + text ──
  Widget _buildFull() => Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space3,
          vertical: AppSpacing.space1,
        ),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppSpacing.space4),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFFD700).withAlpha(100),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.workspace_premium_rounded,
                size: 14, color: Colors.white),
            const SizedBox(width: AppSpacing.space1),
            Text(
              _isExpired
                  ? 'VIP'
                  : expiresAt != null
                      ? 'VIP'
                      : 'VIP Member',
              style: AppTextStyles.caption.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      );

  // ── Badge nhỏ gọn ──
  Widget _buildCompact() => Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space2,
          vertical: 2,
        ),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(AppSpacing.space3),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.workspace_premium_rounded,
                size: 10, color: Colors.white),
            const SizedBox(width: 2),
            Text(
              'VIP',
              style: AppTextStyles.caption.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 9,
              ),
            ),
          ],
        ),
      );

  // ── Badge hết hạn: xám ──
  Widget _buildExpired() => Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.space3,
          vertical: AppSpacing.space1,
        ),
        decoration: BoxDecoration(
          color: AppColors.actionDisabled,
          borderRadius: BorderRadius.circular(AppSpacing.space4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.workspace_premium_rounded,
                size: 14, color: AppColors.backgroundCard),
            const SizedBox(width: AppSpacing.space1),
            Text(
              'VIP Hết hạn',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.backgroundCard,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
}

import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../atoms/status_badge.dart';

/// ═══════════════════════════════════════════════════════
/// C-17: SupportTicketTile
/// Height 80px, category icon, title + category + date, status badge
/// ═══════════════════════════════════════════════════════

class SupportTicketTile extends StatelessWidget {
  const SupportTicketTile({
    super.key,
    required this.title,
    required this.category,
    required this.createdAt,
    required this.status,
    required this.onTap,
  });

  /// Tiêu đề ticket
  final String title;

  /// Loại vấn đề
  final String category;

  /// Thời gian tạo
  final DateTime createdAt;

  /// Trạng thái: open | in_progress | resolved | closed
  final String status;

  /// Callback khi tap
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 80,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.componentPad,
          vertical: AppSpacing.space3,
        ),
        decoration: BoxDecoration(
          color: CardTokens.bg,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(
            color: CardTokens.border,
            width: AppBorderWidth.thin,
          ),
        ),
        child: Row(
          children: [
            // ── Category icon circle 40px ──
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _categoryColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(_categoryIcon, size: 20, color: _categoryColor),
            ),

            const SizedBox(width: AppSpacing.space3),

            // ── Title + category + date ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodyMd.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${_categoryLabel(category)} · ${_formatDate(createdAt)}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: AppSpacing.space2),

            // ── Status badge ──
            StatusBadge(type: _statusType),
          ],
        ),
      ),
    );
  }

  /// Màu icon theo category
  Color get _categoryColor => switch (category) {
    'payment_error' || 'vip_not_activated' => AppColors.actionPrimary,
    'app_bug' => AppColors.statusError,
    'data_error' || 'place_wrong_info' => AppColors.actionSecondary,
    'suggestion' => AppColors.statusInfo,
    _ => AppColors.textSecondary,
  };

  /// Icon theo category
  IconData get _categoryIcon => switch (category) {
    'payment_error' || 'vip_not_activated' => Icons.payment_rounded,
    'app_bug' => Icons.bug_report_rounded,
    'data_error' || 'place_wrong_info' => Icons.edit_note_rounded,
    'suggestion' => Icons.lightbulb_outline_rounded,
    _ => Icons.help_outline_rounded,
  };

  /// Map status string → StatusType enum
  StatusType get _statusType => switch (status) {
    'open' => StatusType.open,
    'in_progress' => StatusType.inProgress,
    'resolved' => StatusType.resolved,
    'closed' => StatusType.resolved,
    _ => StatusType.pending,
  };

  /// Label category tiếng Việt
  String _categoryLabel(String cat) => switch (cat) {
    'payment_error' => 'Lỗi thanh toán',
    'vip_not_activated' => 'VIP chưa kích hoạt',
    'data_error' => 'Dữ liệu sai',
    'app_bug' => 'Lỗi ứng dụng',
    'place_wrong_info' => 'Thông tin địa điểm sai',
    'suggestion' => 'Góp ý',
    'other' => 'Khác',
    _ => cat,
  };

  /// Format ngày: "15/06/2026"
  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/'
        '${dt.year}';
  }
}

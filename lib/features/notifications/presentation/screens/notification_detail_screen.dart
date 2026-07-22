import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-34: NotificationDetailScreen
/// Mở thông báo cụ thể — hero image, type badge, actions
/// ═══════════════════════════════════════════════════════

class NotificationDetailScreen extends StatelessWidget {
  const NotificationDetailScreen({
    super.key,
    required this.type,
    required this.title,
    required this.body,
    required this.timestamp,
    this.imageUrl,
    this.actionLabel,
    this.onAction,
  });

  final NotifType type;
  final String title;
  final String body;
  final DateTime timestamp;
  final String? imageUrl;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Chi tiết thông báo',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: () => Navigator.maybePop(context),
            tooltip: 'Xoá thông báo',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Hero image ──
            if (imageUrl != null)
              Image.network(
                imageUrl!,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  height: 200,
                  color: SagePalette.sage200,
                  child: const Icon(
                    Icons.image_outlined,
                    size: 64,
                    color: SagePalette.sage400,
                  ),
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Type badge ──
                  Row(
                    children: [
                      _TypeBadge(type: type),
                      const Spacer(),
                      Text(
                        _formatTime(timestamp),
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.space3),

                  // ── Title ──
                  Text(
                    title,
                    style: AppTextStyles.h3.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: AppSpacing.space3),
                  const AppDivider(),
                  const SizedBox(height: AppSpacing.space3),

                  // ── Body ──
                  Text(
                    body,
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.textPrimary,
                      height: 1.6,
                    ),
                  ),

                  const SizedBox(height: AppSpacing.layoutMd),

                  // ── Action button ──
                  if (actionLabel != null)
                    AppButton(label: actionLabel!, onPressed: onAction),

                  const SizedBox(height: AppSpacing.layoutSm),

                  AppButton(
                    label: 'Đóng',
                    variant: AppButtonVariant.text,
                    onPressed: () => Navigator.maybePop(context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

enum NotifType { trip, review, follow, system, promotion }

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});
  final NotifType type;

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = switch (type) {
      NotifType.trip => (
        'Lịch trình',
        AppColors.actionPrimary,
        Icons.map_rounded,
      ),
      NotifType.review => ('Đánh giá', SagePalette.sage500, Icons.star_rounded),
      NotifType.follow => (
        'Người theo dõi',
        AppColors.actionSecondary,
        Icons.person_add_rounded,
      ),
      NotifType.system => (
        'Hệ thống',
        AppColors.textSecondary,
        Icons.info_rounded,
      ),
      NotifType.promotion => (
        'Khuyến mãi',
        AppColors.statusWarning,
        Icons.local_offer_rounded,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space3,
        vertical: AppSpacing.space1,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

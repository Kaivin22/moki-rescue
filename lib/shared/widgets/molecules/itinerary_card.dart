import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-11: ItineraryCard
/// Full-width, height 180px, radius.card
/// Hero image + gradient overlay + content
/// ═══════════════════════════════════════════════════════

class ItineraryCard extends StatelessWidget {
  const ItineraryCard({
    super.key,
    required this.title,
    required this.imageUrl,
    required this.numDays,
    required this.onTap,
    this.authorName,
    this.authorAvatarUrl,
    this.viewCount,
    this.isVipLocked = false,
  });

  /// Tên lịch trình
  final String title;

  /// URL ảnh cover
  final String imageUrl;

  /// Số ngày
  final int numDays;

  /// Callback khi tap
  final VoidCallback onTap;

  /// Tên tác giả
  final String? authorName;

  /// URL avatar tác giả
  final String? authorAvatarUrl;

  /// Số lượt xem
  final int? viewCount;

  /// Khóa VIP (cần nâng cấp để clone)
  final bool isVipLocked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 180,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: AppRadius.cardBorder,
          boxShadow: AppShadows.md,
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // ── Hero image ──
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (_, _) => Container(color: SagePalette.sage200),
              errorWidget: (_, _, _) => Container(
                color: SagePalette.sage300,
                child: const Icon(
                  Icons.landscape_outlined,
                  color: SagePalette.sage400,
                  size: 40,
                ),
              ),
            ),

            // ── Gradient overlay (dark bottom → transparent top) ──
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.1),
                    Colors.black.withValues(alpha: 0.6),
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
            ),

            // ── Days badge (top-right) ──
            Positioned(
              top: AppSpacing.space3,
              right: AppSpacing.space3,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space3,
                  vertical: AppSpacing.space1,
                ),
                decoration: BoxDecoration(
                  color: AppColors.actionPrimary,
                  borderRadius: AppRadius.chipBorder,
                ),
                child: Text(
                  '$numDays ngày',
                  style: AppTextStyles.label.copyWith(
                    color: AppColors.textOnPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

            // ── Bottom content (title + author + views) ──
            Positioned(
              left: AppSpacing.space4,
              right: AppSpacing.space4,
              bottom: AppSpacing.space4,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Tiêu đề lịch trình
                  Text(
                    title,
                    style: AppTextStyles.h4.copyWith(
                      color: AppColors.textOnDark,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // Author + views
                  Row(
                    children: [
                      // Author avatar + name
                      if (authorName != null) ...[
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: SagePalette.sage300,
                          backgroundImage: authorAvatarUrl != null
                              ? CachedNetworkImageProvider(authorAvatarUrl!)
                              : null,
                          child: authorAvatarUrl == null
                              ? Text(
                                  authorName!.isNotEmpty
                                      ? authorName![0].toUpperCase()
                                      : '?',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.textOnDark,
                                    fontWeight: FontWeight.w600,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: AppSpacing.space2),
                        Expanded(
                          child: Text(
                            authorName!,
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textOnDark.withValues(alpha: 0.8),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ] else
                        const Spacer(),

                      // View count
                      if (viewCount != null) ...[
                        Icon(
                          Icons.visibility_outlined,
                          size: 14,
                          color: AppColors.textOnDark.withValues(alpha: 0.6),
                        ),
                        const SizedBox(width: AppSpacing.space1),
                        Text(
                          _formatViewCount(viewCount!),
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textOnDark.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // ── VIP lock overlay ──
            if (isVipLocked) ...[
              Container(
                color: Colors.black.withValues(alpha: 0.4),
              ),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space4,
                    vertical: AppSpacing.space2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.actionPrimary,
                    borderRadius: AppRadius.chipBorder,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.lock_rounded, size: 16,
                          color: AppColors.textOnPrimary),
                      const SizedBox(width: AppSpacing.space2),
                      Text(
                        'VIP',
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textOnPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Format view count: 1200 → "1,2K"
  String _formatViewCount(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}

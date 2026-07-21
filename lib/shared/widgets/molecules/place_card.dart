import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../atoms/category_icon.dart';
import '../atoms/star_rating.dart';

/// ═══════════════════════════════════════════════════════
/// C-09: PlaceCard (vertical card)
/// Size: w=160, h=220px, radius.card
/// Hero image 55% + bottom info section
/// ═══════════════════════════════════════════════════════

class PlaceCard extends StatelessWidget {
  const PlaceCard({
    super.key,
    required this.name,
    required this.imageUrl,
    required this.category,
    required this.rating,
    required this.onTap,
    this.durationMin,
    this.entryFee,
    this.isSaved = false,
    this.onSave,
  });

  /// Tên địa điểm
  final String name;

  /// URL ảnh đại diện
  final String imageUrl;

  /// Loại địa điểm (beach, mountain, etc.)
  final String category;

  /// Điểm đánh giá (0.0 → 5.0)
  final double rating;

  /// Callback khi tap vào card
  final VoidCallback onTap;

  /// Thời gian tham quan trung bình (phút)
  final int? durationMin;

  /// Giá vé vào (VND, null = miễn phí)
  final int? entryFee;

  /// Đã lưu yêu thích chưa
  final bool isSaved;

  /// Callback khi tap nút save
  final VoidCallback? onSave;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160,
        height: 220,
        decoration: BoxDecoration(
          color: CardTokens.bg,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(
            color: CardTokens.border,
            width: AppBorderWidth.thin,
          ),
          boxShadow: AppShadows.md,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Hero image (55% = ~121px) ──
            Expanded(
              flex: 55,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Ảnh nền
                  CachedNetworkImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, _) => Container(
                      color: SagePalette.sage200,
                    ),
                    errorWidget: (_, _, _) => Container(
                      color: SagePalette.sage200,
                      child: const Icon(
                        Icons.image_not_supported_outlined,
                        color: SagePalette.sage400,
                      ),
                    ),
                  ),

                  // Category badge (top-left)
                  Positioned(
                    top: AppSpacing.space2,
                    left: AppSpacing.space2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.space2,
                        vertical: AppSpacing.space1,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundOliveTint.withValues(alpha: 0.9),
                        borderRadius: AppRadius.chipBorder,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            CategoryIcon.getEmoji(category),
                            style: const TextStyle(fontSize: 10),
                          ),
                          const SizedBox(width: 2),
                          Text(
                            category,
                            style: AppTextStyles.label.copyWith(
                              color: OlivePalette.olive600,
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Heart save button (top-right)
                  if (onSave != null)
                    Positioned(
                      top: AppSpacing.space2,
                      right: AppSpacing.space2,
                      child: GestureDetector(
                        onTap: onSave,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppColors.backgroundCard.withValues(alpha: 0.9),
                            shape: BoxShape.circle,
                            boxShadow: AppShadows.sm,
                          ),
                          child: Icon(
                            isSaved
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 16,
                            color: isSaved
                                ? AppColors.actionPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Bottom info section (45%) ──
            Expanded(
              flex: 45,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.space3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tên địa điểm
                    Expanded(
                      child: Text(
                        name,
                        style: AppTextStyles.bodyMd.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),

                    const SizedBox(height: AppSpacing.space1),

                    // Stars + duration
                    Row(
                      children: [
                        StarRating(
                          rating: rating,
                          size: StarSize.sm,
                        ),
                        if (durationMin != null) ...[
                          const Spacer(),
                          Text(
                            '${durationMin}p',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),

                    // Giá vé
                    if (entryFee != null) ...[
                      const SizedBox(height: AppSpacing.space1),
                      Text(
                        entryFee == 0
                            ? 'Miễn phí'
                            : '${_formatCurrency(entryFee!)}đ',
                        style: AppTextStyles.caption.copyWith(
                          color: entryFee == 0
                              ? AppColors.statusSuccess
                              : AppColors.actionPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Format số tiền VND: 100000 → "100.000"
  String _formatCurrency(int amount) {
    final str = amount.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buffer.write('.');
      buffer.write(str[i]);
    }
    return buffer.toString();
  }
}

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../atoms/star_rating.dart';

/// ═══════════════════════════════════════════════════════
/// C-10: PlaceListTile
/// Height: 96px, thumbnail 80×80 r=12
/// Name, address, tags, rating + distance, save heart
/// ═══════════════════════════════════════════════════════

class PlaceListTile extends StatelessWidget {
  const PlaceListTile({
    super.key,
    required this.name,
    required this.imageUrl,
    required this.address,
    required this.category,
    required this.rating,
    required this.onTap,
    this.distance,
    this.tags,
    this.isSaved = false,
    this.onSave,
    this.trailing,
  });

  /// Tên địa điểm
  final String name;

  /// URL ảnh thumbnail
  final String imageUrl;

  /// Địa chỉ
  final String address;

  /// Loại địa điểm
  final String category;

  /// Điểm đánh giá
  final double rating;

  /// Callback khi tap
  final VoidCallback onTap;

  /// Khoảng cách từ vị trí user (km)
  final double? distance;

  /// Tags bổ sung
  final List<String>? tags;

  /// Đã lưu yêu thích
  final bool isSaved;

  /// Callback khi tap save
  final VoidCallback? onSave;

  /// Widget trailing tùy chỉnh (thay cho heart)
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 96,
        padding: const EdgeInsets.all(AppSpacing.space2),
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
            // ── Thumbnail 80×80 ──
            ClipRRect(
              borderRadius: AppRadius.thumbnailBorder,
              child: CachedNetworkImage(
                imageUrl: imageUrl,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(
                  width: 80,
                  height: 80,
                  color: SagePalette.sage200,
                ),
                errorWidget: (_, _, _) => Container(
                  width: 80,
                  height: 80,
                  color: SagePalette.sage200,
                  child: const Icon(
                    Icons.image_not_supported_outlined,
                    color: SagePalette.sage400,
                    size: 20,
                  ),
                ),
              ),
            ),

            const SizedBox(width: AppSpacing.space3),

            // ── Thông tin chính ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Tên địa điểm
                  Text(
                    name,
                    style: AppTextStyles.bodyMd.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: AppSpacing.space1),

                  // Địa chỉ
                  Text(
                    address,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: AppSpacing.space1),

                  // Rating + distance
                  Row(
                    children: [
                      StarRating(rating: rating, size: StarSize.sm),
                      const SizedBox(width: AppSpacing.space2),
                      Text(
                        rating.toStringAsFixed(1),
                        style: AppTextStyles.caption.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (distance != null) ...[
                        const SizedBox(width: AppSpacing.space2),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: const BoxDecoration(
                            color: AppColors.textSecondary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space2),
                        Text(
                          '${distance!.toStringAsFixed(1)} km',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // ── Trailing: save heart hoặc custom ──
            if (trailing != null)
              trailing!
            else if (onSave != null)
              IconButton(
                onPressed: onSave,
                icon: Icon(
                  isSaved
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  size: 20,
                  color: isSaved
                      ? AppColors.actionPrimary
                      : AppColors.textSecondary,
                ),
                tooltip: isSaved ? 'Bỏ lưu' : 'Lưu yêu thích',
              ),
          ],
        ),
      ),
    );
  }
}

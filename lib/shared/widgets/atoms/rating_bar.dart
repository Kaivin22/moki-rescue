import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// C-04: RatingBar
/// Variants: compact | full (interactive) | breakdown
/// WCAG: Semantics label "Đánh giá X trên 5"
/// ═══════════════════════════════════════════════════════

/// Loại hiển thị rating
enum RatingBarVariant { compact, full, breakdown }

/// Rating bar — hiển thị hoặc chọn đánh giá sao
class RatingBar extends StatelessWidget {
  const RatingBar({
    super.key,
    required this.rating,
    this.variant = RatingBarVariant.compact,
    this.reviewCount,
    this.onRatingChanged,
    this.starSize = 18,
    this.breakdownData,
  });

  /// Điểm đánh giá hiện tại (0.0 → 5.0)
  final double rating;

  /// Loại hiển thị
  final RatingBarVariant variant;

  /// Số lượng đánh giá (hiển thị bên cạnh)
  final int? reviewCount;

  /// Callback khi user chọn rating (chỉ variant full)
  final ValueChanged<int>? onRatingChanged;

  /// Kích thước ngôi sao
  final double starSize;

  /// Dữ liệu phân bố cho variant breakdown
  /// Map: star level (1-5) → percentage (0.0-1.0)
  final Map<int, double>? breakdownData;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label:
          'Đánh giá ${rating.toStringAsFixed(1)} trên 5'
          '${reviewCount != null ? ', $reviewCount lượt đánh giá' : ''}',
      child: switch (variant) {
        RatingBarVariant.compact => _buildCompact(),
        RatingBarVariant.full => _buildFull(),
        RatingBarVariant.breakdown => _buildBreakdown(),
      },
    );
  }

  /// Compact: ★★★★½ 4.5 (120 đánh giá)
  Widget _buildCompact() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Sao amber
        ...List.generate(5, (i) => _buildStar(i + 1, starSize)),
        const SizedBox(width: AppSpacing.space1),
        // Số điểm
        Text(
          rating.toStringAsFixed(1),
          style: AppTextStyles.bodyMd.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        // Số lượt đánh giá
        if (reviewCount != null) ...[
          const SizedBox(width: AppSpacing.space1),
          Text(
            '($reviewCount đánh giá)',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }

  /// Full: 5 sao interactive, tap để chọn
  Widget _buildFull() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final starIndex = i + 1;
        return GestureDetector(
          onTap: onRatingChanged != null
              ? () => onRatingChanged!(starIndex)
              : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: _buildStar(starIndex, 40),
          ),
        );
      }),
    );
  }

  /// Breakdown: thanh phân bổ cho từng mức sao
  Widget _buildBreakdown() {
    final data = breakdownData ?? {};
    return Column(
      children: List.generate(5, (i) {
        final starLevel = 5 - i;
        final percentage = data[starLevel] ?? 0.0;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(
            children: [
              // Label "5 ★"
              SizedBox(
                width: 32,
                child: Text(
                  '$starLevel ★',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.space2),
              // Thanh progress
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: percentage,
                    minHeight: 8,
                    backgroundColor: SagePalette.sage200,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.actionPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.space2),
              // Phần trăm
              SizedBox(
                width: 36,
                child: Text(
                  '${(percentage * 100).round()}%',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  /// Vẽ 1 ngôi sao: filled, half, hoặc empty
  Widget _buildStar(int starIndex, double size) {
    final IconData icon;
    final Color color;

    if (starIndex <= rating.floor()) {
      // Sao filled
      icon = Icons.star_rounded;
      color = AmberPalette.amber400;
    } else if (starIndex == rating.ceil() && rating % 1 != 0) {
      // Sao nửa
      icon = Icons.star_half_rounded;
      color = AmberPalette.amber400;
    } else {
      // Sao trống
      icon = Icons.star_outline_rounded;
      color = NeutralPalette.neutral300;
    }

    return Icon(icon, size: size, color: color);
  }
}

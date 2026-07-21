import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';

/// ═══════════════════════════════════════════════════════
/// C-07: StarRating (display only)
/// Filled amber stars, half-star support, grey empty stars
/// Sizes: sm(14) | md(18) | lg(24)
/// ═══════════════════════════════════════════════════════

/// Kích thước sao
enum StarSize { sm, md, lg }

/// Hiển thị sao đánh giá (chỉ xem, không tương tác)
class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.rating,
    this.size = StarSize.md,
    this.starCount = 5,
    this.color,
  });

  /// Điểm đánh giá (0.0 → 5.0)
  final double rating;

  /// Kích thước
  final StarSize size;

  /// Số sao tối đa
  final int starCount;

  /// Override màu sao (mặc định amber.400)
  final Color? color;

  /// Kích thước pixel
  double get _sizePixels => switch (size) {
    StarSize.sm => 14,
    StarSize.md => 18,
    StarSize.lg => 24,
  };

  @override
  Widget build(BuildContext context) {
    final starColor = color ?? AmberPalette.amber400;

    return Semantics(
      label: 'Đánh giá ${rating.toStringAsFixed(1)} trên $starCount',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(starCount, (index) {
          final starIndex = index + 1;
          final IconData icon;
          final Color iconColor;

          if (starIndex <= rating.floor()) {
            icon = Icons.star_rounded;
            iconColor = starColor;
          } else if (starIndex == rating.ceil() && rating % 1 != 0) {
            icon = Icons.star_half_rounded;
            iconColor = starColor;
          } else {
            icon = Icons.star_outline_rounded;
            iconColor = NeutralPalette.neutral300;
          }

          return Icon(icon, size: _sizePixels, color: iconColor);
        }),
      ),
    );
  }
}

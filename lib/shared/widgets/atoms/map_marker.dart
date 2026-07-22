import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// MapMarker — Widget hiển thị pin địa điểm trên bản đồ
///
/// Vì apple_maps_flutter dùng BitmapDescriptor cho annotation,
/// widget này được dùng như preview trong danh sách hoặc
/// render ra bitmap bằng RepaintBoundary + toImage().
///
/// Biến thể:
///   MapMarker(category: 'beach') — pin theo category
///   MapMarker.selected(...)      — pin được chọn (lớn hơn)
///   MapMarker.numbered(number: 3) — pin có số thứ tự (lịch trình)
/// ═══════════════════════════════════════════════════════

class MapMarker extends StatelessWidget {
  const MapMarker({
    super.key,
    required this.category,
    this.isSelected = false,
    this.label,
  }) : number = null;

  const MapMarker.selected({super.key, required this.category, this.label})
    : isSelected = true,
      number = null;

  const MapMarker.numbered({
    super.key,
    required this.number,
    this.category = 'viewpoint',
  }) : isSelected = false,
       label = null;

  final String category;
  final bool isSelected;
  final String? label;
  final int? number;

  @override
  Widget build(BuildContext context) {
    final color = _categoryColor(category);
    final icon = _categoryIcon(category);
    final size = isSelected ? 52.0 : 40.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── Bubble ──
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: isSelected ? color : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: isSelected ? 0 : 2.5),
            boxShadow: [
              BoxShadow(
                color: color.withAlpha(isSelected ? 120 : 60),
                blurRadius: isSelected ? 16 : 8,
                spreadRadius: isSelected ? 2 : 0,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Center(
            child: number != null
                ? Text(
                    '$number',
                    style: AppTextStyles.caption.copyWith(
                      color: isSelected ? Colors.white : color,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  )
                : Icon(
                    icon,
                    size: isSelected ? 22 : 18,
                    color: isSelected ? Colors.white : color,
                  ),
          ),
        ),
        // ── Pointer tail ──
        CustomPaint(
          size: Size(isSelected ? 12 : 8, isSelected ? 8 : 6),
          painter: _TrianglePainter(color: color),
        ),
        // ── Label (optional) ──
        if (label != null) ...[
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.space2,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(AppSpacing.space2),
            ),
            child: Text(
              label!,
              style: AppTextStyles.caption.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 9,
              ),
            ),
          ),
        ],
      ],
    );
  }

  static Color _categoryColor(String category) => switch (category) {
    'beach' => const Color(0xFF1B9CE5),
    'mountain' => const Color(0xFF5B8C5A),
    'temple' => const Color(0xFFB07D39),
    'museum' => const Color(0xFF7B5EA7),
    'food' => const Color(0xFFE8604C),
    'market' => const Color(0xFFE89A3C),
    'entertainment' => const Color(0xFFD4567A),
    'nature' => const Color(0xFF4C9E52),
    'historical' => const Color(0xFF8B6914),
    'viewpoint' => const Color(0xFF2D7DD2),
    'park' => const Color(0xFF3DAA6B),
    _ => AppColors.actionPrimary,
  };

  static IconData _categoryIcon(String category) => switch (category) {
    'beach' => Icons.beach_access_rounded,
    'mountain' => Icons.landscape_rounded,
    'temple' => Icons.temple_buddhist_rounded,
    'museum' => Icons.museum_rounded,
    'food' => Icons.restaurant_rounded,
    'market' => Icons.storefront_rounded,
    'entertainment' => Icons.attractions_rounded,
    'nature' => Icons.park_rounded,
    'historical' => Icons.account_balance_rounded,
    'viewpoint' => Icons.visibility_rounded,
    'park' => Icons.local_florist_rounded,
    _ => Icons.place_rounded,
  };
}

/// Hình tam giác nhỏ dưới bubble (đuôi pin)
class _TrianglePainter extends CustomPainter {
  const _TrianglePainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_TrianglePainter old) => old.color != color;
}

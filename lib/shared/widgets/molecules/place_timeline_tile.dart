import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-13: PlaceTimelineTile
/// Inside DayCard — timeline layout
/// Time column + dashed vertical line + place info + thumbnail
/// ═══════════════════════════════════════════════════════

class PlaceTimelineTile extends StatelessWidget {
  const PlaceTimelineTile({
    super.key,
    required this.placeName,
    this.arrivalTime,
    this.durationMin,
    this.note,
    this.transportToNext,
    this.transportDurationMin,
    this.thumbnailUrl,
    this.isLast = false,
    this.onTap,
    this.dragHandle,
  });

  /// Tên địa điểm
  final String placeName;

  /// Giờ đến (HH:mm)
  final String? arrivalTime;

  /// Thời gian tham quan (phút)
  final int? durationMin;

  /// Ghi chú cho địa điểm này
  final String? note;

  /// Phương tiện di chuyển đến điểm tiếp theo
  final String? transportToNext;

  /// Thời gian di chuyển đến điểm tiếp theo (phút)
  final int? transportDurationMin;

  /// URL thumbnail nhỏ
  final String? thumbnailUrl;

  /// Là item cuối (không vẽ dashed line xuống dưới)
  final bool isLast;

  /// Callback khi tap
  final VoidCallback? onTap;

  /// Widget drag handle (cho ReorderableListView)
  final Widget? dragHandle;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Cột thời gian (48px) ──
            SizedBox(
              width: 48,
              child: Column(
                children: [
                  if (arrivalTime != null)
                    Text(
                      arrivalTime!,
                      style: AppTextStyles.caption.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.actionPrimary,
                      ),
                    ),
                  if (durationMin != null)
                    Text(
                      '${durationMin}p',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                ],
              ),
            ),

            // ── Dashed vertical connector ──
            SizedBox(
              width: 24,
              child: Column(
                children: [
                  // Dot tròn tại vị trí hiện tại
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: AppColors.actionPrimary,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.backgroundCard,
                        width: 2,
                      ),
                    ),
                  ),
                  // Dashed line xuống điểm tiếp theo
                  if (!isLast)
                    Expanded(
                      child: CustomPaint(
                        painter: _DashedLinePainter(
                          color: SagePalette.sage300,
                          strokeWidth: 2,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(width: AppSpacing.space2),

            // ── Thông tin địa điểm ──
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.space4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tên địa điểm
                    Text(
                      placeName,
                      style: AppTextStyles.bodySm.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Duration chip
                    if (durationMin != null) ...[
                      const SizedBox(height: AppSpacing.space1),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.space2,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundSecondary,
                          borderRadius: BorderRadius.circular(AppRadius.xs),
                        ),
                        child: Text(
                          '⏱ $durationMin phút',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],

                    // Note
                    if (note != null && note!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.space1),
                      Text(
                        note!,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                          fontStyle: FontStyle.italic,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],

                    // Transport chip (đến điểm tiếp theo)
                    if (transportToNext != null && !isLast) ...[
                      const SizedBox(height: AppSpacing.space2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.space2,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundOliveTint,
                          borderRadius: BorderRadius.circular(AppRadius.xs),
                        ),
                        child: Text(
                          '${_transportEmoji(transportToNext!)} '
                          '${transportDurationMin ?? '?'} phút',
                          style: AppTextStyles.caption.copyWith(
                            color: OlivePalette.olive600,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // ── Drag handle (nếu có) ──
            ?dragHandle,
          ],
        ),
      ),
    );
  }

  /// Emoji phương tiện di chuyển
  String _transportEmoji(String transport) => switch (transport) {
    'motorbike' => '🏍',
    'car' => '🚗',
    'walk' => '🚶',
    'bicycle' => '🚲',
    _ => '🚶',
  };
}

/// Vẽ đường đứt nét (dashed line) dọc
class _DashedLinePainter extends CustomPainter {
  const _DashedLinePainter({required this.color, required this.strokeWidth});

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    const dashHeight = 5.0;
    const gapHeight = 3.0;
    double startY = 0;
    final centerX = size.width / 2;

    while (startY < size.height) {
      canvas.drawLine(
        Offset(centerX, startY),
        Offset(centerX, (startY + dashHeight).clamp(0, size.height)),
        paint,
      );
      startY += dashHeight + gapHeight;
    }
  }

  @override
  bool shouldRepaint(_DashedLinePainter oldDelegate) =>
      color != oldDelegate.color || strokeWidth != oldDelegate.strokeWidth;
}

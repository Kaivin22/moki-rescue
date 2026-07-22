import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-44: ShareItineraryScreen
/// QR code display + copy link + native share
/// ═══════════════════════════════════════════════════════

class ShareItineraryScreen extends StatefulWidget {
  const ShareItineraryScreen({
    super.key,
    required this.itineraryId,
    required this.itineraryTitle,
  });

  final String itineraryId;
  final String itineraryTitle;

  @override
  State<ShareItineraryScreen> createState() => _ShareItineraryScreenState();
}

class _ShareItineraryScreenState extends State<ShareItineraryScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  bool _linkCopied = false;

  String get _shareLink =>
      'https://danang.app/itinerary/${widget.itineraryId}?ref=share';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _shareLink));
    setState(() => _linkCopied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _linkCopied = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Chia sẻ lịch trình',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          children: [
            // ── Title ──
            Text(
              widget.itineraryTitle,
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.space2),
            Text(
              'Chia sẻ lịch trình với bạn bè bằng QR code hoặc link',
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: AppSpacing.layoutLg),

            // ── QR Code placeholder ──
            AnimatedBuilder(
              animation: _pulseController,
              builder: (_, child) => Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.backgroundCard,
                  borderRadius: AppRadius.cardBorder,
                  border: Border.all(
                    color: AppColors.actionPrimary.withValues(
                      alpha: 0.3 + 0.3 * _pulseController.value,
                    ),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.actionPrimary.withValues(
                        alpha: 0.15 * _pulseController.value,
                      ),
                      blurRadius: 20,
                    ),
                  ],
                ),
                child: child,
              ),
              child: CustomPaint(
                size: const Size(200, 200),
                painter: _QrCodePainter(seed: widget.itineraryId),
              ),
            ),

            const SizedBox(height: AppSpacing.space2),
            Text(
              'Quét để xem lịch trình',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutLg),

            // ── Share link ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: AppRadius.cardBorder,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _shareLink,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space2),
                  GestureDetector(
                    onTap: _copyLink,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.space3,
                        vertical: AppSpacing.space2,
                      ),
                      decoration: BoxDecoration(
                        color: _linkCopied
                            ? AppColors.statusSuccess
                            : AppColors.actionPrimary,
                        borderRadius: AppRadius.chipBorder,
                      ),
                      child: Text(
                        _linkCopied ? '✓ Đã sao chép' : 'Sao chép',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Share options ──
            Text(
              'Chia sẻ qua',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: AppSpacing.space3),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ShareOption(emoji: '💬', label: 'Zalo', onTap: () {}),
                _ShareOption(emoji: '📘', label: 'Facebook', onTap: () {}),
                _ShareOption(emoji: '📸', label: 'Instagram', onTap: () {}),
                _ShareOption(emoji: '📨', label: 'Tin nhắn', onTap: () {}),
                _ShareOption(emoji: '⋯', label: 'Thêm', onTap: () {}),
              ],
            ),

            const SizedBox(height: AppSpacing.layoutLg),

            // ── Visibility control ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: AppRadius.cardBorder,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Quyền truy cập',
                    style: AppTextStyles.bodyMd.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  ...[
                    '🌐 Công khai — ai cũng có thể xem',
                    '🔗 Chỉ người có link',
                    '🔒 Riêng tư',
                  ].map(
                    (opt) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                      child: GestureDetector(
                        onTap: () {},
                        child: Row(
                          children: [
                            Container(
                              width: 20,
                              height: 20,
                              margin: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: opt == '🔗 Chỉ người có link'
                                      ? AppColors.actionPrimary
                                      : AppColors.borderDefault,
                                  width: 2,
                                ),
                              ),
                              child: opt == '🔗 Chỉ người có link'
                                  ? Center(
                                      child: Container(
                                        width: 10,
                                        height: 10,
                                        decoration: const BoxDecoration(
                                          color: AppColors.actionPrimary,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            Expanded(
                              child: Text(opt, style: AppTextStyles.bodyMd),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),
            AppButton(label: '🔗 Chia sẻ link', onPressed: () {}),
            const SizedBox(height: AppSpacing.layoutXl),
          ],
        ),
      ),
    );
  }
}

class _ShareOption extends StatelessWidget {
  const _ShareOption({
    required this.emoji,
    required this.label,
    required this.onTap,
  });
  final String emoji;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Center(
            child: Text(emoji, style: const TextStyle(fontSize: 24)),
          ),
        ),
        const SizedBox(height: AppSpacing.space1),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
      ],
    ),
  );
}

/// Fake QR code painter using deterministic random squares
class _QrCodePainter extends CustomPainter {
  const _QrCodePainter({required this.seed});
  final String seed;

  @override
  void paint(Canvas canvas, Size size) {
    final rand = math.Random(seed.hashCode);
    const cells = 20;
    final cellSize = size.width / cells;

    final darkPaint = Paint()..color = const Color(0xFF2D3320);
    final lightPaint = Paint()..color = Colors.white;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(8),
      ),
      lightPaint,
    );

    // Draw position markers (3 corners)
    _drawMarker(canvas, darkPaint, lightPaint, 0, 0, cellSize);
    _drawMarker(
      canvas,
      darkPaint,
      lightPaint,
      (cells - 7) * cellSize,
      0,
      cellSize,
    );
    _drawMarker(
      canvas,
      darkPaint,
      lightPaint,
      0,
      (cells - 7) * cellSize,
      cellSize,
    );

    // Data cells
    for (var r = 0; r < cells; r++) {
      for (var c = 0; c < cells; c++) {
        final isMarker =
            (r < 7 && c < 7) ||
            (r < 7 && c >= cells - 7) ||
            (r >= cells - 7 && c < 7);
        if (!isMarker && rand.nextBool()) {
          canvas.drawRect(
            Rect.fromLTWH(
              c * cellSize + 1,
              r * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            ),
            darkPaint,
          );
        }
      }
    }
  }

  void _drawMarker(
    Canvas canvas,
    Paint dark,
    Paint light,
    double x,
    double y,
    double cell,
  ) {
    canvas.drawRect(Rect.fromLTWH(x, y, cell * 7, cell * 7), dark);
    canvas.drawRect(
      Rect.fromLTWH(x + cell, y + cell, cell * 5, cell * 5),
      light,
    );
    canvas.drawRect(
      Rect.fromLTWH(x + cell * 2, y + cell * 2, cell * 3, cell * 3),
      dark,
    );
  }

  @override
  bool shouldRepaint(_QrCodePainter old) => old.seed != seed;
}

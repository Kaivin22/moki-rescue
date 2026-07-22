import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';

/// SCREEN-ADMIN-ANALYTICS: Thống kê + biểu đồ
/// Custom painter charts (không cần fl_chart)
class AdminAnalyticsScreen extends ConsumerWidget {
  const AdminAnalyticsScreen({super.key});

  static const _categoryData = [
    (label: 'Biển', count: 28, color: Color(0xFF00BCD4)),
    (label: 'Ẩm thực', count: 45, color: Color(0xFFFF6B6B)),
    (label: 'Lịch sử', count: 19, color: Color(0xFFFFA500)),
    (label: 'Thiên nhiên', count: 33, color: Color(0xFF4CAF50)),
    (label: 'Ngắm cảnh', count: 22, color: Color(0xFF6C63FF)),
    (label: 'Mua sắm', count: 14, color: Color(0xFFE91E63)),
  ];

  static const _weeklyTickets = [3, 7, 5, 12, 8, 4, 9];
  static const _weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    backgroundColor: AppColors.backgroundSecondary,
    appBar: AppBar(
      title: Text(
        'Phân tích thống kê',
        style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
      ),
      backgroundColor: AppColors.backgroundPrimary,
      surfaceTintColor: Colors.transparent,
    ),
    body: ListView(
      padding: const EdgeInsets.all(AppSpacing.layoutSm),
      children: [
        // ── Category bar chart ──
        _ChartCard(
          title: '📍 Địa điểm theo danh mục',
          child: Column(
            children: _categoryData.map((d) {
              final max = _categoryData
                  .map((x) => x.count)
                  .reduce((a, b) => a > b ? a : b);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    SizedBox(
                      width: 60,
                      child: Text(
                        d.label,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: d.count / max,
                          backgroundColor: AppColors.backgroundSecondary,
                          valueColor: AlwaysStoppedAnimation<Color>(d.color),
                          minHeight: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      d.count.toString(),
                      style: AppTextStyles.caption.copyWith(
                        fontWeight: FontWeight.w700,
                        color: d.color,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: AppSpacing.layoutSm),

        // ── Weekly tickets chart ──
        _ChartCard(
          title: '🎫 Tickets theo tuần',
          child: SizedBox(
            height: 160,
            child: CustomPaint(
              size: const Size(double.infinity, 160),
              painter: _LineChartPainter(
                values: _weeklyTickets.map((v) => v.toDouble()).toList(),
                color: AppColors.actionPrimary,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: List.generate(
                  _weeklyTickets.length,
                  (i) => Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          _weeklyTickets[i].toString(),
                          style: AppTextStyles.caption.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.actionPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _weekDays[i],
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: AppSpacing.layoutSm),

        // ── Summary table ──
        _ChartCard(
          title: '📊 Tổng kết tháng này',
          child: Table(
            columnWidths: const {
              0: FlexColumnWidth(2),
              1: FlexColumnWidth(1),
              2: FlexColumnWidth(1),
            },
            children: [
              _tableRow('Chỉ số', 'Tháng này', 'Tháng trước', isHeader: true),
              _tableRow('Người dùng mới', '124', '98'),
              _tableRow('Lịch trình tạo', '312', '287'),
              _tableRow('Đánh giá mới', '89', '71'),
              _tableRow('VIP đăng ký', '23', '18'),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.layoutMd),
      ],
    ),
  );

  TableRow _tableRow(
    String col1,
    String col2,
    String col3, {
    bool isHeader = false,
  }) => TableRow(
    decoration: isHeader
        ? BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(8),
              topRight: Radius.circular(8),
            ),
          )
        : null,
    children: [col1, col2, col3].map((text) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Text(
          text,
          style: isHeader
              ? AppTextStyles.caption.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                )
              : AppTextStyles.bodyMd,
        ),
      );
    }).toList(),
  );
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(AppSpacing.space4),
    decoration: BoxDecoration(
      color: AppColors.backgroundCard,
      borderRadius: AppRadius.cardBorder,
      border: Border.all(color: AppColors.borderDefault),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.layoutSm),
        child,
      ],
    ),
  );
}

class _LineChartPainter extends CustomPainter {
  const _LineChartPainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxVal = values.reduce((a, b) => a > b ? a : b);
    if (maxVal == 0) return;

    final paint = Paint()
      ..color = color.withValues(alpha: 0.3)
      ..style = PaintingStyle.fill;

    final linePaint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    final fillPath = Path();
    final step = size.width / (values.length - 1);
    const topPad = 20.0;
    const botPad = 24.0;
    final chartH = size.height - topPad - botPad;

    for (int i = 0; i < values.length; i++) {
      final x = i * step;
      final y = topPad + chartH * (1 - values[i] / maxVal);
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height - botPad);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }

    fillPath.lineTo((values.length - 1) * step, size.height - botPad);
    fillPath.close();

    canvas.drawPath(fillPath, paint);
    canvas.drawPath(path, linePaint);

    // Dots
    for (int i = 0; i < values.length; i++) {
      final x = i * step;
      final y = topPad + chartH * (1 - values[i] / maxVal);
      canvas.drawCircle(
        Offset(x, y),
        4,
        Paint()
          ..color = color
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

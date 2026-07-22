import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/admin_providers.dart';

/// SCREEN-ADMIN-SYNC: Đồng bộ dữ liệu Google Places
class AdminSyncScreen extends ConsumerWidget {
  const AdminSyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(adminSyncProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Đồng bộ Google Places',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Info card ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.space4),
              decoration: BoxDecoration(
                color: AppColors.actionPrimary.withValues(alpha: 0.05),
                borderRadius: AppRadius.cardBorder,
                border: Border.all(
                  color: AppColors.actionPrimary.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('ℹ️', style: TextStyle(fontSize: 20)),
                      const SizedBox(width: AppSpacing.space2),
                      Text(
                        'Thông tin đồng bộ',
                        style: AppTextStyles.bodyMd.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  _InfoRow(label: 'API', value: 'Google Places API v2'),
                  _InfoRow(label: 'Khu vực', value: 'Đà Nẵng + Hội An'),
                  _InfoRow(
                    label: 'Loại',
                    value: 'tourist_attraction, restaurant, lodging',
                  ),
                  _InfoRow(label: 'Lần cuối', value: 'Hôm nay 09:00'),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Sync steps ──
            Text(
              'Quá trình đồng bộ',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.space3),

            ..._steps.map(
              (step) => _SyncStep(
                icon: step.icon,
                title: step.title,
                subtitle: step.subtitle,
                done: syncState.log != null,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Log ──
            if (syncState.log != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.space4),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A1628),
                  borderRadius: AppRadius.cardBorder,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '✅ Log',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.statusSuccess,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    Text(
                      syncState.log!,
                      style: const TextStyle(
                        color: Color(0xFF98FB98),
                        fontFamily: 'monospace',
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.layoutMd),
            ],

            if (syncState.error != null)
              Text(
                '❌ ${syncState.error!}',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.statusError,
                ),
              ),

            const Spacer(),

            AppButton(
              label: syncState.isLoading
                  ? '⏳ Đang đồng bộ...'
                  : '🔄 Bắt đầu đồng bộ',
              onPressed: syncState.isLoading
                  ? null
                  : () => ref.read(adminSyncProvider.notifier).triggerSync(),
            ),

            const SizedBox(height: AppSpacing.layoutMd),
          ],
        ),
      ),
    );
  }

  static const _steps = [
    (
      icon: '🔍',
      title: 'Tìm kiếm địa điểm',
      subtitle: 'Query Google Places API theo khu vực',
    ),
    (
      icon: '📥',
      title: 'Import dữ liệu',
      subtitle: 'Upsert vào bảng places (tránh trùng)',
    ),
    (
      icon: '🌍',
      title: 'Cập nhật tọa độ',
      subtitle: 'Đồng bộ lat/lng + PostGIS geometry',
    ),
    (icon: '✅', title: 'Xác nhận', subtitle: 'Kiểm tra và báo cáo kết quả'),
  ];
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.space2),
    child: Row(
      children: [
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w500),
          ),
        ),
      ],
    ),
  );
}

class _SyncStep extends StatelessWidget {
  const _SyncStep({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.done,
  });

  final String icon;
  final String title;
  final String subtitle;
  final bool done;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.space3),
    child: Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: done
                ? AppColors.statusSuccess.withValues(alpha: 0.1)
                : AppColors.backgroundSecondary,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: done
                  ? AppColors.statusSuccess.withValues(alpha: 0.3)
                  : AppColors.borderDefault,
            ),
          ),
          child: Center(
            child: done
                ? Icon(
                    Icons.check_rounded,
                    color: AppColors.statusSuccess,
                    size: 16,
                  )
                : Text(icon, style: const TextStyle(fontSize: 14)),
          ),
        ),
        const SizedBox(width: AppSpacing.space3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.bodyMd.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                subtitle,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

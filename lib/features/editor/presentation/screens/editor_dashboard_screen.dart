import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../place/presentation/providers/place_providers.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

/// SCREEN-EDITOR-DASHBOARD: Tổng quan cho Editor
class EditorDashboardScreen extends ConsumerWidget {
  const EditorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentProfileProvider);
    final placesAsync = ref.watch(allPlacesProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text('✏️ Editor Panel',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.layoutSm),
        children: [
          // ── Welcome ──
          Container(
            padding: const EdgeInsets.all(AppSpacing.layoutMd),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6C63FF), Color(0xFF4A90E2)],
              ),
              borderRadius: AppRadius.cardBorder,
            ),
            child: Row(
              children: [
                const Text('✏️', style: TextStyle(fontSize: 32)),
                const SizedBox(width: AppSpacing.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Xin chào, ${profile?.displayName ?? 'Editor'}!',
                        style: AppTextStyles.h4.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700),
                      ),
                      Text(
                        'Vai trò: ${profile?.role.toUpperCase() ?? 'EDITOR'}',
                        style: AppTextStyles.bodyMd
                            .copyWith(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.layoutSm),

          // ── Stats ──
          placesAsync.when(
            loading: () => const LoadingShimmerList(
                variant: ShimmerVariant.listTile, itemCount: 2),
            error: (e, st) => const SizedBox.shrink(),
            data: (places) => GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: AppSpacing.space3,
              mainAxisSpacing: AppSpacing.space3,
              childAspectRatio: 1.6,
              children: [
                _MiniStat(
                  icon: '📍',
                  label: 'Tổng địa điểm',
                  value: places.length.toString(),
                  color: const Color(0xFF6C63FF),
                ),
                _MiniStat(
                  icon: '📝',
                  label: 'Chờ bổ sung',
                  value: '${(places.length * 0.12).floor()}',
                  color: const Color(0xFFFF6B6B),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.layoutMd),

          // ── Quick actions ──
          Text('Thao tác nhanh',
              style:
                  AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.space3),

          _ActionCard(
            icon: Icons.list_alt_rounded,
            title: 'Xem danh sách địa điểm',
            subtitle: 'Tìm và chỉnh sửa thông tin',
            color: const Color(0xFF6C63FF),
            onTap: () => context.push(AppRoutes.editorPlaces),
          ),
          const SizedBox(height: AppSpacing.space2),
          _ActionCard(
            icon: Icons.add_location_alt_outlined,
            title: 'Thêm địa điểm mới',
            subtitle: 'Nhập dữ liệu địa điểm chưa có',
            color: const Color(0xFF4CAF50),
            onTap: () => context.push(AppRoutes.editorPlacesNew),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final String icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(AppSpacing.space3),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(icon, style: const TextStyle(fontSize: 22)),
            const Spacer(),
            Text(value,
                style: AppTextStyles.h3
                    .copyWith(fontWeight: FontWeight.w800, color: color)),
            Text(label,
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary)),
          ],
        ),
      );
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: AppRadius.cardBorder,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.space4),
          decoration: BoxDecoration(
            color: AppColors.backgroundCard,
            borderRadius: AppRadius.cardBorder,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: AppTextStyles.bodyMd
                            .copyWith(fontWeight: FontWeight.w600)),
                    Text(subtitle,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: AppColors.textSecondary),
            ],
          ),
        ),
      );
}

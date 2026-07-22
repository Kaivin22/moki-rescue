import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../providers/admin_providers.dart';

/// SCREEN-ADMIN-DASHBOARD: Tổng quan hệ thống
class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(adminStatsProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text(
          '⚙️ Admin Panel',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(adminStatsProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: statsAsync.when(
        loading: () => const LoadingShimmerList(
          variant: ShimmerVariant.listTile,
          itemCount: 6,
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('❌', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text(
                'Lỗi tải dữ liệu',
                style: AppTextStyles.h4.copyWith(color: AppColors.statusError),
              ),
              TextButton(
                onPressed: () => ref.invalidate(adminStatsProvider),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
        data: (stats) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminStatsProvider),
          color: AppColors.actionPrimary,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            children: [
              // ── Stats grid ──
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: AppSpacing.space3,
                mainAxisSpacing: AppSpacing.space3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.6,
                children: [
                  _StatCard(
                    icon: '📍',
                    label: 'Địa điểm',
                    value: stats.totalPlaces.toString(),
                    color: const Color(0xFF6C63FF),
                  ),
                  _StatCard(
                    icon: '👥',
                    label: 'Người dùng',
                    value: stats.totalUsers.toString(),
                    color: const Color(0xFF00BCD4),
                  ),
                  _StatCard(
                    icon: '🎫',
                    label: 'Ticket mở',
                    value: stats.openTickets.toString(),
                    color: const Color(0xFFFF6B6B),
                  ),
                  _StatCard(
                    icon: '👑',
                    label: 'VIP',
                    value: stats.vipUsers.toString(),
                    color: const Color(0xFFFFA500),
                  ),
                  _StatCard(
                    icon: '⭐',
                    label: 'Đánh giá',
                    value: stats.totalReviews.toString(),
                    color: const Color(0xFF4CAF50),
                  ),
                  _StatCard(
                    icon: '🗺️',
                    label: 'Lịch trình',
                    value: stats.totalItineraries.toString(),
                    color: const Color(0xFFE91E63),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.layoutMd),

              // ── Quick nav ──
              Text(
                'Quản lý nhanh',
                style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.space3),

              ..._navItems(context).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                  child: _NavCard(item: item),
                ),
              ),

              const SizedBox(height: AppSpacing.layoutMd),
            ],
          ),
        ),
      ),
    );
  }

  List<_NavItem> _navItems(BuildContext context) => [
    _NavItem(
      icon: Icons.place_outlined,
      label: 'Quản lý địa điểm',
      subtitle: 'Thêm, sửa, xóa địa điểm',
      color: const Color(0xFF6C63FF),
      onTap: () => context.push(AppRoutes.adminPlaces),
    ),
    _NavItem(
      icon: Icons.people_outlined,
      label: 'Quản lý người dùng',
      subtitle: 'Xem danh sách, phân quyền',
      color: const Color(0xFF00BCD4),
      onTap: () => context.push(AppRoutes.adminUsers),
    ),
    _NavItem(
      icon: Icons.support_agent_outlined,
      label: 'Hỗ trợ & Tickets',
      subtitle: 'Xử lý yêu cầu người dùng',
      color: const Color(0xFFFF6B6B),
      onTap: () => context.push(AppRoutes.adminTickets),
    ),
    _NavItem(
      icon: Icons.bar_chart_rounded,
      label: 'Phân tích thống kê',
      subtitle: 'Charts & báo cáo',
      color: const Color(0xFF4CAF50),
      onTap: () => context.push(AppRoutes.adminAnalytics),
    ),
    _NavItem(
      icon: Icons.sync_rounded,
      label: 'Đồng bộ Google Places',
      subtitle: 'Cập nhật dữ liệu từ Google',
      color: const Color(0xFFFFA500),
      onTap: () => context.push(AppRoutes.adminSync),
    ),
  ];
}

class _StatCard extends StatelessWidget {
  const _StatCard({
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
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(icon, style: const TextStyle(fontSize: 16)),
              ),
            ),
            const Spacer(),
          ],
        ),
        const Spacer(),
        Text(
          value,
          style: AppTextStyles.h3.copyWith(
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
      ],
    ),
  );
}

class _NavItem {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
}

class _NavCard extends StatelessWidget {
  const _NavCard({required this.item});
  final _NavItem item;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: item.onTap,
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
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: item.color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, color: item.color, size: 20),
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label,
                  style: AppTextStyles.bodyMd.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  item.subtitle,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
        ],
      ),
    ),
  );
}

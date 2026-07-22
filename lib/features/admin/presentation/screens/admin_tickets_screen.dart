import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../providers/admin_providers.dart';
import '../../../support/domain/models/support_ticket.dart';

/// SCREEN-ADMIN-TICKETS: Quản lý support tickets
class AdminTicketsScreen extends ConsumerStatefulWidget {
  const AdminTicketsScreen({super.key});

  @override
  ConsumerState<AdminTicketsScreen> createState() => _AdminTicketsScreenState();
}

class _AdminTicketsScreenState extends ConsumerState<AdminTicketsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const _tabs = [
    (id: 'all', label: 'Tất cả'),
    (id: 'open', label: 'Chờ'),
    (id: 'in_progress', label: 'Đang xử lý'),
    (id: 'resolved', label: 'Xong'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentStatus = _tabs[_tabController.index].id;
    final ticketsAsync = ref.watch(adminTicketsProvider(currentStatus));

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Tickets hỗ trợ',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelStyle: AppTextStyles.bodyMd.copyWith(
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: AppTextStyles.bodyMd,
          labelColor: AppColors.actionPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.actionPrimary,
          tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
        ),
      ),
      body: ticketsAsync.when(
        loading: () => const LoadingShimmerList(
          variant: ShimmerVariant.listTile,
          itemCount: 6,
        ),
        error: (e, _) => EmptyState(type: EmptyStateType.noResults),
        data: (tickets) {
          if (tickets.isEmpty) {
            return EmptyState(type: EmptyStateType.noTickets);
          }
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(adminTicketsProvider(currentStatus)),
            color: AppColors.actionPrimary,
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              itemCount: tickets.length,
              separatorBuilder: (_, idx) =>
                  const SizedBox(height: AppSpacing.space2),
              itemBuilder: (_, i) => _AdminTicketTile(ticket: tickets[i]),
            ),
          );
        },
      ),
    );
  }
}

class _AdminTicketTile extends StatelessWidget {
  const _AdminTicketTile({required this.ticket});
  final SupportTicket ticket;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('${AppRoutes.adminTickets}/${ticket.id}'),
    borderRadius: AppRadius.cardBorder,
    child: Container(
      padding: const EdgeInsets.all(AppSpacing.space4),
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
              Expanded(
                child: Text(
                  ticket.title,
                  style: AppTextStyles.bodyMd.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _StatusBadge(ticket.status, ticket.statusLabel),
            ],
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            ticket.categoryLabel,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.space1),
          Text(
            ticket.description,
            style: AppTextStyles.bodySm.copyWith(
              color: AppColors.textSecondary,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.space2),
          Text(
            _fmt(ticket.createdAt),
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    ),
  );

  String _fmt(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inHours < 24) return '${diff.inHours}h trước';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge(this.status, this.label);
  final String status;
  final String label;

  Color get _color => switch (status) {
    'open' => AppColors.statusWarning,
    'in_progress' => AppColors.actionPrimary,
    'resolved' => AppColors.statusSuccess,
    _ => AppColors.textSecondary,
  };

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: _color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: _color.withValues(alpha: 0.3)),
    ),
    child: Text(
      label,
      style: AppTextStyles.caption.copyWith(
        color: _color,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

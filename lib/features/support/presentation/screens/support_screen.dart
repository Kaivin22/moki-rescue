import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../domain/models/support_ticket.dart';
import '../providers/support_providers.dart';

/// SCREEN-SUPPORT: Danh sách ticket hỗ trợ của user
class SupportScreen extends ConsumerWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(myTicketsProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Hỗ trợ',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ticketsAsync.when(
        loading: () => const LoadingShimmerList(
          variant: ShimmerVariant.listTile,
          itemCount: 4,
        ),
        error: (e, _) => EmptyState(
          type: EmptyStateType.noResults,
          actionLabel: 'Thử lại',
          onAction: () => ref.invalidate(myTicketsProvider),
        ),
        data: (tickets) {
          if (tickets.isEmpty) {
            return EmptyState(
              type: EmptyStateType.noTickets,
              actionLabel: 'Tạo yêu cầu hỗ trợ',
              onAction: () => context.push(AppRoutes.newTicket),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myTicketsProvider),
            color: AppColors.actionPrimary,
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              itemCount: tickets.length,
              separatorBuilder: (_, idx) =>
                  const SizedBox(height: AppSpacing.space2),
              itemBuilder: (_, i) => _TicketTile(ticket: tickets[i]),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.newTicket),
        backgroundColor: AppColors.actionPrimary,
        foregroundColor: AppColors.textOnPrimary,
        icon: const Icon(Icons.add_rounded),
        label: Text(
          'Tạo yêu cầu',
          style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket});
  final SupportTicket ticket;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () =>
        context.push(AppRoutes.ticketDetail.replaceAll(':id', ticket.id)),
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
              const SizedBox(width: AppSpacing.space2),
              _StatusBadge(status: ticket.status),
            ],
          ),
          const SizedBox(height: AppSpacing.space2),
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
        ],
      ),
    ),
  );
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  Color get _color {
    switch (status) {
      case 'open':
        return AppColors.statusWarning;
      case 'in_progress':
        return AppColors.actionPrimary;
      case 'resolved':
        return AppColors.statusSuccess;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = SupportTicket(
      id: '',
      userId: '',
      title: '',
      description: '',
      category: '',
      status: status,
      createdAt: DateTime.now(),
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color.withValues(alpha: 0.3)),
      ),
      child: Text(
        ticket.statusLabel,
        style: AppTextStyles.caption.copyWith(
          color: _color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

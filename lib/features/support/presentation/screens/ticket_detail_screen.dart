import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../providers/support_providers.dart';
import '../../domain/models/support_ticket.dart';

/// SCREEN-TICKET-DETAIL: Chi tiết 1 ticket hỗ trợ
class TicketDetailScreen extends ConsumerWidget {
  const TicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketAsync = ref.watch(ticketDetailProvider(ticketId));

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Chi tiết yêu cầu',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ticketAsync.when(
        loading: () => const LoadingShimmerList(
          variant: ShimmerVariant.listTile,
          itemCount: 3,
        ),
        error: (e, _) => EmptyState(type: EmptyStateType.noResults),
        data: (ticket) {
          if (ticket == null) {
            return EmptyState(type: EmptyStateType.noResults);
          }
          return _TicketDetailBody(ticket: ticket);
        },
      ),
    );
  }
}

class _TicketDetailBody extends StatelessWidget {
  const _TicketDetailBody({required this.ticket});
  final SupportTicket ticket;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Status + category row ──
            Row(
              children: [
                _StatusChip(ticket.status, ticket.statusLabel),
                const SizedBox(width: AppSpacing.space2),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.borderDefault),
                  ),
                  child: Text(
                    ticket.categoryLabel,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Title ──
            Text(
              ticket.title,
              style:
                  AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700),
            ),

            const SizedBox(height: AppSpacing.space2),

            Text(
              _formatDate(ticket.createdAt),
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── User message ──
            _MessageBubble(
              text: ticket.description,
              isUser: true,
              time: _formatDate(ticket.createdAt),
            ),

            // ── Admin reply (nếu có) ──
            if (ticket.adminReply != null) ...[
              const SizedBox(height: AppSpacing.layoutSm),
              _MessageBubble(
                text: ticket.adminReply!,
                isUser: false,
                time: ticket.resolvedAt != null
                    ? _formatDate(ticket.resolvedAt!)
                    : '',
              ),
            ] else if (ticket.isOpen) ...[
              const SizedBox(height: AppSpacing.layoutMd),
              Container(
                padding: const EdgeInsets.all(AppSpacing.space4),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: AppRadius.cardBorder,
                  border:
                      Border.all(color: AppColors.borderDefault),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded,
                        color: AppColors.statusWarning, size: 20),
                    const SizedBox(width: AppSpacing.space2),
                    Expanded(
                      child: Text(
                        'Đội ngũ hỗ trợ đang xem xét yêu cầu của bạn.\nThường phản hồi trong 24 giờ làm việc.',
                        style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.layoutXl),
          ],
        ),
      );

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status, this.label);
  final String status;
  final String label;

  Color get _color {
    switch (status) {
      case 'open': return AppColors.statusWarning;
      case 'in_progress': return AppColors.actionPrimary;
      case 'resolved': return AppColors.statusSuccess;
      default: return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: _color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _color.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: AppTextStyles.caption
              .copyWith(color: _color, fontWeight: FontWeight.w600),
        ),
      );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.text,
    required this.isUser,
    required this.time,
  });

  final String text;
  final bool isUser;
  final String time;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment:
                isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              if (!isUser) ...[
                CircleAvatar(
                  radius: 14,
                  backgroundColor:
                      AppColors.actionPrimary.withValues(alpha: 0.15),
                  child: const Icon(Icons.support_agent_rounded,
                      size: 16, color: AppColors.actionPrimary),
                ),
                const SizedBox(width: AppSpacing.space2),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.space3),
                  decoration: BoxDecoration(
                    color: isUser
                        ? AppColors.actionPrimary
                        : AppColors.backgroundCard,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    border: isUser
                        ? null
                        : Border.all(color: AppColors.borderDefault),
                  ),
                  child: Text(
                    text,
                    style: AppTextStyles.bodyMd.copyWith(
                      color: isUser
                          ? AppColors.textOnPrimary
                          : AppColors.textPrimary,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              if (isUser) const SizedBox(width: AppSpacing.space2),
            ],
          ),
          if (time.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(
                top: 4,
                left: isUser ? 0 : 34,
                right: isUser ? AppSpacing.space2 : 0,
              ),
              child: Text(
                time,
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary),
              ),
            ),
        ],
      );
}

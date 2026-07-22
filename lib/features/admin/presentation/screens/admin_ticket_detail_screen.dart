import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/admin_providers.dart';
import '../../../support/presentation/providers/support_providers.dart';

/// SCREEN-ADMIN-TICKET-DETAIL: Xử lý ticket + reply admin
class AdminTicketDetailScreen extends ConsumerStatefulWidget {
  const AdminTicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  ConsumerState<AdminTicketDetailScreen> createState() =>
      _AdminTicketDetailScreenState();
}

class _AdminTicketDetailScreenState
    extends ConsumerState<AdminTicketDetailScreen> {
  final _replyCtrl = TextEditingController();

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.ticketId));
    final replyState = ref.watch(adminTicketReplyProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Xử lý ticket',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ticketAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Lỗi: $e')),
        data: (ticket) {
          if (ticket == null) {
            return Center(
              child: Text('Không tìm thấy ticket', style: AppTextStyles.bodyMd),
            );
          }

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpacing.layoutMd),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Ticket info ──
                      Text(
                        ticket.title,
                        style: AppTextStyles.h4.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.space2),
                      Row(
                        children: [
                          _Chip(
                            ticket.statusLabel,
                            _statusColor(ticket.status),
                          ),
                          const SizedBox(width: AppSpacing.space2),
                          _Chip(ticket.categoryLabel, AppColors.textSecondary),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.layoutSm),

                      // ── User message ──
                      _MessageCard(
                        sender: 'Người dùng',
                        text: ticket.description,
                        time: _fmt(ticket.createdAt),
                        isAdmin: false,
                      ),

                      if (ticket.adminReply != null) ...[
                        const SizedBox(height: AppSpacing.space3),
                        _MessageCard(
                          sender: '⚙️ Admin',
                          text: ticket.adminReply!,
                          time: ticket.resolvedAt != null
                              ? _fmt(ticket.resolvedAt!)
                              : '',
                          isAdmin: true,
                        ),
                      ],

                      const SizedBox(height: AppSpacing.layoutMd),

                      // ── Status actions ──
                      if (ticket.isOpen) ...[
                        Text(
                          'Thay đổi trạng thái:',
                          style: AppTextStyles.bodyMd.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.space2),
                        Row(
                          children: [
                            _StatusBtn(
                              label: 'Đang xử lý',
                              onTap: () => ref
                                  .read(adminTicketReplyProvider.notifier)
                                  .updateStatus(widget.ticketId, 'in_progress'),
                            ),
                            const SizedBox(width: AppSpacing.space2),
                            _StatusBtn(
                              label: 'Đóng',
                              onTap: () => ref
                                  .read(adminTicketReplyProvider.notifier)
                                  .updateStatus(widget.ticketId, 'closed'),
                              color: AppColors.statusError,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // ── Reply box ──
              if (ticket.adminReply == null)
                Container(
                  padding: const EdgeInsets.all(AppSpacing.layoutSm),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundCard,
                    border: Border(
                      top: BorderSide(color: AppColors.borderDefault),
                    ),
                  ),
                  child: Column(
                    children: [
                      if (replyState.success)
                        Padding(
                          padding: const EdgeInsets.only(
                            bottom: AppSpacing.space2,
                          ),
                          child: Text(
                            '✅ Đã gửi phản hồi!',
                            style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.statusSuccess,
                            ),
                          ),
                        ),
                      TextFormField(
                        controller: _replyCtrl,
                        maxLines: 3,
                        decoration: InputDecoration(
                          hintText: 'Nhập phản hồi cho người dùng...',
                          hintStyle: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.textPlaceholder,
                          ),
                          filled: true,
                          fillColor: AppColors.backgroundSecondary,
                          border: OutlineInputBorder(
                            borderRadius: AppRadius.inputBorder,
                            borderSide: BorderSide(
                              color: AppColors.borderDefault,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: AppRadius.inputBorder,
                            borderSide: BorderSide(
                              color: AppColors.borderDefault,
                            ),
                          ),
                        ),
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.space3),
                      AppButton(
                        label: replyState.isLoading
                            ? 'Đang gửi...'
                            : 'Gửi phản hồi & Đóng ticket',
                        onPressed: replyState.isLoading
                            ? null
                            : () => ref
                                  .read(adminTicketReplyProvider.notifier)
                                  .reply(widget.ticketId, _replyCtrl.text),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Color _statusColor(String s) => switch (s) {
    'open' => AppColors.statusWarning,
    'in_progress' => AppColors.actionPrimary,
    'resolved' => AppColors.statusSuccess,
    _ => AppColors.textSecondary,
  };

  String _fmt(DateTime dt) =>
      '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
}

class _Chip extends StatelessWidget {
  const _Chip(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: color.withValues(alpha: 0.3)),
    ),
    child: Text(label, style: AppTextStyles.caption.copyWith(color: color)),
  );
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.sender,
    required this.text,
    required this.time,
    required this.isAdmin,
  });

  final String sender;
  final String text;
  final String time;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(AppSpacing.space4),
    decoration: BoxDecoration(
      color: isAdmin
          ? AppColors.actionPrimary.withValues(alpha: 0.05)
          : AppColors.backgroundCard,
      borderRadius: AppRadius.cardBorder,
      border: Border.all(
        color: isAdmin
            ? AppColors.actionPrimary.withValues(alpha: 0.2)
            : AppColors.borderDefault,
      ),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          sender,
          style: AppTextStyles.bodySm.copyWith(
            fontWeight: FontWeight.w700,
            color: isAdmin ? AppColors.actionPrimary : AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: AppSpacing.space2),
        Text(text, style: AppTextStyles.bodyMd.copyWith(height: 1.5)),
        if (time.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.space2),
          Text(
            time,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    ),
  );
}

class _StatusBtn extends StatelessWidget {
  const _StatusBtn({required this.label, required this.onTap, this.color});

  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onTap,
    style: OutlinedButton.styleFrom(
      foregroundColor: color ?? AppColors.actionPrimary,
      side: BorderSide(color: color ?? AppColors.actionPrimary),
    ),
    child: Text(label),
  );
}

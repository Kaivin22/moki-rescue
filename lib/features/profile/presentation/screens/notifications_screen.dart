import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-16: NotificationsScreen
/// Grouped ListView: Hôm nay / Tuần này / Trước đó
/// Unread: sage.100 bg | Read: neutral.50 bg
/// ═══════════════════════════════════════════════════════

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  // Demo notification data
  final List<_NotifItem> _notifications = [
    _NotifItem(
      id: '1',
      icon: Icons.favorite_rounded,
      iconColor: AppColors.statusError,
      title: 'Lịch trình của bạn nhận 12 lượt thích',
      subtitle: '3 ngày Đà Nẵng - Hội An',
      time: '5 phút trước',
      isRead: false,
      group: 'today',
    ),
    _NotifItem(
      id: '2',
      icon: Icons.comment_rounded,
      iconColor: AppColors.actionSecondary,
      title: 'Minh Anh bình luận về lịch trình của bạn',
      subtitle: '"Hay quá! Cho mình hỏi..."',
      time: '2 giờ trước',
      isRead: false,
      group: 'today',
    ),
    _NotifItem(
      id: '3',
      icon: Icons.star_rounded,
      iconColor: AppColors.actionPrimary,
      title: 'VIP của bạn sẽ hết hạn trong 3 ngày',
      subtitle: 'Gia hạn để tiếp tục sử dụng AI không giới hạn',
      time: '1 ngày trước',
      isRead: true,
      group: 'week',
    ),
    _NotifItem(
      id: '4',
      icon: Icons.place_rounded,
      iconColor: AppColors.actionSecondary,
      title: 'Địa điểm mới: Cầu Vàng Đà Nẵng',
      subtitle: 'Vừa được thêm vào hệ thống',
      time: '3 ngày trước',
      isRead: true,
      group: 'week',
    ),
    _NotifItem(
      id: '5',
      icon: Icons.check_circle_rounded,
      iconColor: AppColors.statusSuccess,
      title: 'Yêu cầu hỗ trợ #0042 đã được giải quyết',
      subtitle: 'Cảm ơn bạn đã phản hồi',
      time: '2 tuần trước',
      isRead: true,
      group: 'older',
    ),
  ];

  void _markAllRead() {
    setState(() {
      for (final n in _notifications) {
        n.isRead = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final todayItems = _notifications.where((n) => n.group == 'today').toList();
    final weekItems = _notifications.where((n) => n.group == 'week').toList();
    final olderItems = _notifications.where((n) => n.group == 'older').toList();

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Thông báo',
          style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700),
        ),
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: Text(
              'Đánh dấu đã đọc',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.actionSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: _notifications.isEmpty
          ? EmptyState(type: EmptyStateType.noTickets)
          : ListView(
              children: [
                if (todayItems.isNotEmpty) ...[
                  _GroupHeader('Hôm nay'),
                  ...todayItems.map(_NotifTile.new),
                ],
                if (weekItems.isNotEmpty) ...[
                  _GroupHeader('Tuần này'),
                  ...weekItems.map(_NotifTile.new),
                ],
                if (olderItems.isNotEmpty) ...[
                  _GroupHeader('Trước đó'),
                  ...olderItems.map(_NotifTile.new),
                ],
                const SizedBox(height: AppSpacing.layoutMd),
              ],
            ),
    );
  }
}

class _NotifItem {
  _NotifItem({
    required this.id,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.isRead,
    required this.group,
  });

  final String id;
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String time;
  bool isRead;
  final String group;
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.layoutSm,
          AppSpacing.layoutSm,
          AppSpacing.layoutSm,
          AppSpacing.space2,
        ),
        child: Text(
          label.toUpperCase(),
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
      );
}

class _NotifTile extends StatelessWidget {
  const _NotifTile(this.item);
  final _NotifItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: item.isRead
          ? AppColors.backgroundPrimary
          : SagePalette.sage100,
      child: ListTile(
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: item.iconColor.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(item.icon, color: item.iconColor, size: 22),
        ),
        title: Text(
          item.title,
          style: AppTextStyles.bodySm.copyWith(
            fontWeight: item.isRead ? FontWeight.w400 : FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          item.subtitle,
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Text(
          item.time,
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
            fontSize: 10,
          ),
        ),
        onTap: () {},
      ),
    );
  }
}

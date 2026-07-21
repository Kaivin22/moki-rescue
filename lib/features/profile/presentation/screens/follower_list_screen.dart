import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-37: FollowerListScreen
/// Tab: Người theo dõi | Đang theo dõi
/// User row với Follow/Unfollow toggle
/// ═══════════════════════════════════════════════════════

class FollowerListScreen extends StatefulWidget {
  const FollowerListScreen({
    super.key,
    required this.userId,
    required this.displayName,
    this.initialTab = 0,
  });

  final String userId;
  final String displayName;
  final int initialTab;

  @override
  State<FollowerListScreen> createState() => _FollowerListScreenState();
}

class _FollowerListScreenState extends State<FollowerListScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();

  static final _followers = [
    _UserRecord(id: 'u1', name: 'Trần Lan Anh', username: '@lan.anh', avatarUrl: 'https://picsum.photos/seed/u1/80/80', isFollowing: true, trips: 5),
    _UserRecord(id: 'u2', name: 'Lê Bảo Long', username: '@baolong', avatarUrl: 'https://picsum.photos/seed/u2/80/80', isFollowing: false, trips: 12),
    _UserRecord(id: 'u3', name: 'Phạm Thu Hà', username: '@thuha.travel', avatarUrl: 'https://picsum.photos/seed/u3/80/80', isFollowing: true, trips: 3),
    _UserRecord(id: 'u4', name: 'Nguyễn Quang Vinh', username: '@qvinh', avatarUrl: 'https://picsum.photos/seed/u4/80/80', isFollowing: false, trips: 7),
    _UserRecord(id: 'u5', name: 'Đinh Thị Mai', username: '@mai.dng', avatarUrl: 'https://picsum.photos/seed/u5/80/80', isFollowing: true, trips: 15),
  ];

  static final _following = [
    _UserRecord(id: 'u6', name: 'TravelVlog Vietnam', username: '@travelvn', avatarUrl: 'https://picsum.photos/seed/u6/80/80', isFollowing: true, trips: 48),
    _UserRecord(id: 'u7', name: 'Hội An Local Guide', username: '@hoianguide', avatarUrl: 'https://picsum.photos/seed/u7/80/80', isFollowing: true, trips: 31),
    _UserRecord(id: 'u1', name: 'Trần Lan Anh', username: '@lan.anh', avatarUrl: 'https://picsum.photos/seed/u1/80/80', isFollowing: true, trips: 5),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this, initialIndex: widget.initialTab);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(widget.displayName, style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.actionPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.actionPrimary,
          indicatorWeight: 2,
          labelStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
          tabs: [
            Tab(text: 'Người theo dõi · ${_followers.length}'),
            Tab(text: 'Đang theo dõi · ${_following.length}'),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Search ──
          Padding(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Tìm người dùng...',
                hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textPlaceholder),
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(borderRadius: AppRadius.inputBorder, borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.space3, vertical: 12),
              ),
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _UserList(users: _applySearch(_followers), isOwnProfile: true),
                _UserList(users: _applySearch(_following), isOwnProfile: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<_UserRecord> _applySearch(List<_UserRecord> list) {
    final q = _searchController.text.toLowerCase();
    if (q.isEmpty) return list;
    return list.where((u) =>
        u.name.toLowerCase().contains(q) || u.username.toLowerCase().contains(q)).toList();
  }
}

class _UserRecord {
  _UserRecord({
    required this.id,
    required this.name,
    required this.username,
    required this.avatarUrl,
    required this.isFollowing,
    required this.trips,
  });

  final String id;
  final String name;
  final String username;
  final String avatarUrl;
  bool isFollowing;
  final int trips;
}

class _UserList extends StatefulWidget {
  const _UserList({required this.users, required this.isOwnProfile});
  final List<_UserRecord> users;
  final bool isOwnProfile;

  @override
  State<_UserList> createState() => _UserListState();
}

class _UserListState extends State<_UserList> {
  @override
  Widget build(BuildContext context) {
    if (widget.users.isEmpty) return EmptyState(type: EmptyStateType.noResults);

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      itemCount: widget.users.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 64),
      itemBuilder: (_, i) {
        final user = widget.users[i];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.space3),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 24,
                backgroundColor: SagePalette.sage200,
                backgroundImage: CachedNetworkImageProvider(user.avatarUrl),
              ),
              const SizedBox(width: AppSpacing.space3),
              // Name + username + trips
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.name, style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600)),
                    Text(user.username, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                    Text('${user.trips} lịch trình', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              // Follow / Unfollow
              AppButton(
                label: user.isFollowing ? 'Đang theo dõi' : 'Theo dõi',
                variant: user.isFollowing ? AppButtonVariant.secondary : AppButtonVariant.primary,
                isExpanded: false,
                onPressed: () => setState(() => user.isFollowing = !user.isFollowing),
              ),
            ],
          ),
        );
      },
    );
  }
}

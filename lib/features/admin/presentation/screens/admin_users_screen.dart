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
import '../../../auth/domain/models/user_profile.dart';

/// SCREEN-ADMIN-USERS: Danh sách người dùng + search
class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(adminUsersProvider(_query));

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Người dùng',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // ── Search ──
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm,
                AppSpacing.space2,
                AppSpacing.layoutSm,
                AppSpacing.space2),
            child: TextField(
              controller: _searchController,
              onChanged: (v) {
                Future.delayed(const Duration(milliseconds: 400), () {
                  if (mounted && _searchController.text == v) {
                    setState(() => _query = v.trim());
                  }
                });
              },
              decoration: InputDecoration(
                hintText: 'Tìm theo tên...',
                hintStyle: AppTextStyles.bodyMd
                    .copyWith(color: AppColors.textPlaceholder),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: AppColors.textSecondary),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(
                    borderRadius: AppRadius.inputBorder,
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space3, vertical: 12),
              ),
              style: AppTextStyles.bodyMd
                  .copyWith(color: AppColors.textPrimary),
            ),
          ),

          // ── List ──
          Expanded(
            child: usersAsync.when(
              loading: () => const LoadingShimmerList(
                  variant: ShimmerVariant.listTile, itemCount: 8),
              error: (e, _) =>
                  EmptyState(type: EmptyStateType.noResults),
              data: (users) {
                if (users.isEmpty) {
                  return EmptyState(type: EmptyStateType.noResults);
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(adminUsersProvider(_query)),
                  color: AppColors.actionPrimary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.layoutSm),
                    itemCount: users.length,
                    separatorBuilder: (_, idx) =>
                        const SizedBox(height: AppSpacing.space2),
                    itemBuilder: (_, i) => _UserTile(user: users[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  const _UserTile({required this.user});
  final UserProfile user;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () => context.push(
          '${AppRoutes.adminUsers}/${user.id}?name=${Uri.encodeComponent(user.displayName)}',
        ),
        borderRadius: AppRadius.cardBorder,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.space3),
          decoration: BoxDecoration(
            color: AppColors.backgroundCard,
            borderRadius: AppRadius.cardBorder,
            border: Border.all(color: AppColors.borderDefault),
          ),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 20,
                backgroundColor:
                    AppColors.actionPrimary.withValues(alpha: 0.15),
                backgroundImage: user.avatarUrl != null
                    ? NetworkImage(user.avatarUrl!)
                    : null,
                child: user.avatarUrl == null
                    ? Text(
                        user.displayName.isNotEmpty
                            ? user.displayName[0].toUpperCase()
                            : '?',
                        style: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.actionPrimary,
                            fontWeight: FontWeight.w700),
                      )
                    : null,
              ),
              const SizedBox(width: AppSpacing.space3),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.displayName,
                      style: AppTextStyles.bodyMd
                          .copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'ID: ${user.id.substring(0, 8)}...',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              // Role badge
              _RoleBadge(user.role),
              if (user.isVip) ...[
                const SizedBox(width: AppSpacing.space2),
                const Text('👑',
                    style: TextStyle(fontSize: 14)),
              ],
              const SizedBox(width: AppSpacing.space2),
              Icon(Icons.chevron_right_rounded,
                  color: AppColors.textSecondary, size: 18),
            ],
          ),
        ),
      );
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge(this.role);
  final String role;

  Color get _color => switch (role) {
        'admin' => AppColors.statusError,
        'editor' => AppColors.actionPrimary,
        _ => AppColors.textSecondary,
      };

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: _color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _color.withValues(alpha: 0.3)),
        ),
        child: Text(
          role.toUpperCase(),
          style: AppTextStyles.caption
              .copyWith(color: _color, fontWeight: FontWeight.w700),
        ),
      );
}

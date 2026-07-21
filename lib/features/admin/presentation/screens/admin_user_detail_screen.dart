import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/admin_providers.dart';
import '../../../auth/domain/models/user_profile.dart';
import '../../../profile/presentation/providers/profile_providers.dart';

/// SCREEN-ADMIN-USER-DETAIL: Chi tiết user + phân quyền
class AdminUserDetailScreen extends ConsumerStatefulWidget {
  const AdminUserDetailScreen({
    super.key,
    required this.userId,
    required this.displayName,
  });

  final String userId;
  final String displayName;

  @override
  ConsumerState<AdminUserDetailScreen> createState() =>
      _AdminUserDetailScreenState();
}

class _AdminUserDetailScreenState
    extends ConsumerState<AdminUserDetailScreen> {
  String? _selectedRole;
  bool _vipToggle = false;
  bool _initialized = false;

  static const _roles = ['user', 'editor', 'admin'];

  @override
  Widget build(BuildContext context) {
    final userAsync =
        ref.watch(userProfileProvider(widget.userId));
    final actionState = ref.watch(adminUserActionProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(widget.displayName,
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: userAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text('Không thể tải thông tin',
              style: AppTextStyles.bodyMd),
        ),
        data: (user) {
          if (user == null) {
            return Center(
              child: Text('Không tìm thấy user',
                  style: AppTextStyles.bodyMd),
            );
          }

          // Initialize state from profile
          if (!_initialized) {
            _selectedRole = user.role;
            _vipToggle = user.isVip;
            _initialized = true;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.layoutMd),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Profile header ──
                _ProfileHeader(user: user),

                const SizedBox(height: AppSpacing.layoutMd),

                // ── Role assignment ──
                _SectionCard(
                  title: 'Phân quyền',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Vai trò hiện tại: ',
                          style: AppTextStyles.bodySm.copyWith(
                              color: AppColors.textSecondary)),
                      const SizedBox(height: AppSpacing.space2),
                      Row(
                        children: _roles.map((role) {
                          final isSelected = _selectedRole == role;
                          return Padding(
                            padding: const EdgeInsets.only(
                                right: AppSpacing.space2),
                            child: ChoiceChip(
                              label: Text(role.toUpperCase(),
                                  style: AppTextStyles.caption.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: isSelected
                                        ? Colors.white
                                        : AppColors.textPrimary,
                                  )),
                              selected: isSelected,
                              selectedColor: AppColors.actionPrimary,
                              backgroundColor:
                                  AppColors.backgroundSecondary,
                              onSelected: (_) => setState(
                                  () => _selectedRole = role),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.space3),

                // ── VIP toggle ──
                _SectionCard(
                  title: 'VIP',
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Kích hoạt VIP 30 ngày',
                          style: AppTextStyles.bodyMd,
                        ),
                      ),
                      Switch(
                        value: _vipToggle,
                        onChanged: (v) => setState(() => _vipToggle = v),
                        activeThumbColor: const Color(0xFFFFA500),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                if (actionState.error != null)
                  Padding(
                    padding:
                        const EdgeInsets.only(bottom: AppSpacing.space3),
                    child: Text(
                      actionState.error!,
                      style: AppTextStyles.bodyMd
                          .copyWith(color: AppColors.statusError),
                    ),
                  ),

                if (actionState.success)
                  Padding(
                    padding:
                        const EdgeInsets.only(bottom: AppSpacing.space3),
                    child: Text(
                      '✅ Đã cập nhật thành công!',
                      style: AppTextStyles.bodyMd
                          .copyWith(color: AppColors.statusSuccess),
                    ),
                  ),

                AppButton(
                  label: actionState.isLoading ? 'Đang lưu...' : 'Lưu thay đổi',
                  onPressed: actionState.isLoading
                      ? null
                      : () async {
                          final notifier = ref
                              .read(adminUserActionProvider.notifier);
                          if (_selectedRole != user.role) {
                            await notifier.updateRole(
                                widget.userId, _selectedRole!);
                          }
                          if (_vipToggle != user.isVip) {
                            await notifier.updateVip(
                                widget.userId,
                                _vipToggle ? 'vip' : 'free');
                          }
                        },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});
  final UserProfile user;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
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
                      style: AppTextStyles.h4.copyWith(
                          color: AppColors.actionPrimary,
                          fontWeight: FontWeight.w700),
                    )
                  : null,
            ),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(user.displayName,
                          style: AppTextStyles.h4.copyWith(
                              fontWeight: FontWeight.w700)),
                      if (user.isVip) ...[
                        const SizedBox(width: AppSpacing.space1),
                        const Text('👑',
                            style: TextStyle(fontSize: 14)),
                      ],
                    ],
                  ),
                  Text(
                    'Tham gia: ${_fmt(user.createdAt)}',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                  Text(
                    '${user.followersCount} followers · ${user.followingCount} following',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  String _fmt(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.space4),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: AppTextStyles.bodyMd
                    .copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.space3),
            child,
          ],
        ),
      );
}

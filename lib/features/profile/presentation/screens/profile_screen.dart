import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';
import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../../../features/itinerary/presentation/providers/itinerary_providers.dart';
import '../../../../features/place/presentation/providers/place_providers.dart';
import '../../../../features/community/presentation/providers/community_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-32: ProfileScreen
/// Avatar + stats + achievements + settings shortcuts
/// ═══════════════════════════════════════════════════════

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  static const _achievements = [
    (emoji: '🏖', label: 'Beach Lover', desc: 'Ghé thăm 5 bãi biển'),
    (emoji: '🗺', label: 'Explorer', desc: 'Tạo 5 lịch trình'),
    (emoji: '⭐', label: 'Reviewer', desc: 'Viết 10 đánh giá'),
    (emoji: '📸', label: 'Photographer', desc: 'Đăng 20 ảnh'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(currentProfileProvider);
    final itineraryCount =
        ref.watch(myItinerariesProvider).valueOrNull?.length ?? 0;
    final savedCount =
        ref.watch(savedPlaceIdsProvider).valueOrNull?.length ?? 0;
    final followerCount =
        ref.watch(myFollowersProvider).valueOrNull?.length ?? 0;
    final followingCount =
        ref.watch(myFollowingProvider).valueOrNull?.length ?? 0;

    final userName = profile?.displayName ?? 'Du khách';
    final userBio = profile?.bio ?? '';
    final avatarUrl = profile?.avatarUrl;
    final isVip = profile?.isVip ?? false;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // ── SliverAppBar: cover + avatar ──
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.backgroundPrimary,
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black38,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.settings_outlined,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () => context.push(AppRoutes.settings),
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black38,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.share_outlined,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () {},
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: 'https://picsum.photos/seed/cover/400/200',
                    fit: BoxFit.cover,
                    placeholder: (_, url) =>
                        Container(color: SagePalette.sage300),
                    errorWidget: (_, url, error) =>
                        Container(color: SagePalette.sage400),
                  ),
                  // Avatar
                  Positioned(
                    left: AppSpacing.layoutSm,
                    bottom: 16,
                    child: Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.backgroundCard,
                              width: 3,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 40,
                            backgroundColor: SagePalette.sage200,
                            backgroundImage: avatarUrl != null
                                ? CachedNetworkImageProvider(avatarUrl)
                                : null,
                            child: avatarUrl == null
                                ? const Icon(
                                    Icons.person_rounded,
                                    size: 36,
                                    color: AppColors.textSecondary,
                                  )
                                : null,
                          ),
                        ),
                        if (isVip)
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: AppColors.actionPrimary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.star_rounded,
                                color: Colors.white,
                                size: 12,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Profile info ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              userName,
                              style: AppTextStyles.h3.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      AppButton(
                        label: 'Chỉnh sửa',
                        variant: AppButtonVariant.secondary,
                        onPressed: () => context.push(AppRoutes.editProfile),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  if (userBio.isNotEmpty)
                    Text(
                      userBio,
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  // ── Stats row ──
                  Row(
                    children: [
                      _StatCell(value: '$itineraryCount', label: 'Lịch trình'),
                      const _StatDivider(),
                      _StatCell(
                        value: '$followerCount',
                        label: 'Người theo dõi',
                      ),
                      const _StatDivider(),
                      _StatCell(
                        value: '$followingCount',
                        label: 'Đang theo dõi',
                      ),
                      const _StatDivider(),
                      _StatCell(value: '$savedCount', label: 'Địa điểm'),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),
                  const AppDivider(),
                  const SizedBox(height: AppSpacing.layoutSm),

                  // ── Achievements ──
                  Text(
                    'Thành tích',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  SizedBox(
                    height: 90,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _achievements.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(width: AppSpacing.space3),
                      itemBuilder: (_, i) {
                        final a = _achievements[i];
                        return _AchievementChip(
                          emoji: a.emoji,
                          label: a.label,
                          desc: a.desc,
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),
                  const AppDivider(),
                  const SizedBox(height: AppSpacing.layoutSm),

                  // ── Quick settings ──
                  Text(
                    'Cài đặt nhanh',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  _SettingsTile(
                    icon: Icons.notifications_outlined,
                    label: 'Thông báo',
                    onTap: () {},
                  ),
                  _SettingsTile(
                    icon: Icons.lock_outlined,
                    label: 'Quyền riêng tư',
                    onTap: () {},
                  ),
                  _SettingsTile(
                    icon: Icons.language_rounded,
                    label: 'Ngôn ngữ',
                    trailing: 'Tiếng Việt',
                    onTap: () {},
                  ),
                  _SettingsTile(
                    icon: Icons.help_outline_rounded,
                    label: 'Trợ giúp',
                    onTap: () => context.push(AppRoutes.helpCenter),
                  ),
                  _SettingsTile(
                    icon: Icons.logout_rounded,
                    label: 'Đăng xuất',
                    isDestructive: true,
                    onTap: () {
                      ref.read(authNotifierProvider.notifier).signOut();
                      context.go(AppRoutes.login);
                    },
                  ),

                  const SizedBox(height: AppSpacing.layoutXl),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: AppTextStyles.h3.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.actionPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          textAlign: TextAlign.center,
        ),
      ],
    ),
  );
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) => Container(
    width: 1,
    height: 32,
    margin: const EdgeInsets.symmetric(horizontal: 4),
    color: AppColors.borderDefault,
  );
}

class _AchievementChip extends StatelessWidget {
  const _AchievementChip({
    required this.emoji,
    required this.label,
    required this.desc,
  });
  final String emoji;
  final String label;
  final String desc;

  @override
  Widget build(BuildContext context) => Container(
    width: 90,
    padding: const EdgeInsets.all(AppSpacing.space3),
    decoration: BoxDecoration(
      color: AppColors.actionPrimary.withValues(alpha: 0.08),
      borderRadius: AppRadius.cardBorder,
      border: Border.all(color: AppColors.actionPrimary.withValues(alpha: 0.2)),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(emoji, style: const TextStyle(fontSize: 24)),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.actionPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        Text(
          desc,
          style: AppTextStyles.caption.copyWith(
            fontSize: 9,
            color: AppColors.textSecondary,
          ),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    ),
  );
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.isDestructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool isDestructive;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.space3),
      child: Row(
        children: [
          Icon(
            icon,
            size: 22,
            color: isDestructive
                ? AppColors.statusError
                : AppColors.textSecondary,
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Text(
              label,
              style: AppTextStyles.bodyMd.copyWith(
                color: isDestructive
                    ? AppColors.statusError
                    : AppColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (trailing != null)
            Text(
              trailing!,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          const SizedBox(width: AppSpacing.space1),
          Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textSecondary,
            size: 18,
          ),
        ],
      ),
    ),
  );
}

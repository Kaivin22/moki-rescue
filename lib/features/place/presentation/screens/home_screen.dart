import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../../../shared/widgets/molecules/itinerary_card.dart';
import '../../../../shared/widgets/molecules/place_card.dart';
import '../../../../shared/widgets/molecules/section_header.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/organisms/search_bar_widget.dart';
import '../providers/place_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-10: HomeScreen (logged-in)
/// CustomScrollView slivers: greeting + search + sections
/// ═══════════════════════════════════════════════════════

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _showOnboardingCard = true;



  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(currentProfileProvider);
    final featuredAsync = ref.watch(featuredPlacesProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // ── SliverAppBar: greeting + notifications ──
          SliverAppBar(
            pinned: true,
            expandedHeight: 0,
            backgroundColor: AppColors.backgroundPrimary,
            surfaceTintColor: Colors.transparent,
            title: _GreetingRow(
              userName: profile?.displayName ?? 'Du khách',
              avatarUrl: profile?.avatarUrl,
              onNotificationTap: () {},
            ),
          ),

          // ── SearchBar ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: AppSpacing.space3,
              ),
              child: SearchBarWidget(
                hint: 'Tìm kiếm địa điểm...',
                readOnly: true,
                onTap: () => context.push(AppRoutes.discover),
              ),
            ),
          ),

          // ── OnboardingPromptCard (có thể dismiss) ──
          if (_showOnboardingCard)
            SliverToBoxAdapter(
              child: _OnboardingPromptCard(
                onDismiss: () => setState(() => _showOnboardingCard = false),
                onAction: () {
                  // TODO: navigate to TravelPreferencesScreen
                },
              ),
            ),

          // ── Quick Actions ──
          const SliverToBoxAdapter(child: _QuickActionsRow()),

          // ── Địa điểm gợi ý ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                0,
              ),
              child: SectionHeader(
                title: 'Địa điểm gợi ý',
                onViewAll: () => context.push(AppRoutes.discover),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: featuredAsync.when(
              loading: () => const LoadingShimmerList(
                variant: ShimmerVariant.placeCard,
                itemCount: 4,
              ),
              error: (error, stack) => const SizedBox(height: 8),
              data: (places) => SizedBox(
                height: 220,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.layoutSm,
                    vertical: AppSpacing.space2,
                  ),
                  itemCount: places.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.space3),
                  itemBuilder: (_, i) {
                    final p = places[i];
                    final isSaved = ref.watch(isSavedProvider(p.id));
                    return PlaceCard(
                      name: p.name,
                      imageUrl: p.thumbnailUrl ?? '',
                      category: p.category,
                      rating: p.ratingAvg,
                      durationMin: p.durationMin,
                      entryFee: p.entryFeeMax,
                      isSaved: isSaved,
                      onTap: () => context.push(
                        AppRoutes.placeDetail,
                        extra: p.id,
                      ),
                      onSave: () => ref
                          .read(savePlaceNotifierProvider.notifier)
                          .toggle(p.id),
                    );
                  },
                ),
              ),
            ),
          ),

          // ── Khám phá cộng đồng (Placeholder) ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                0,
              ),
              child: SectionHeader(
                title: 'Khám phá cộng đồng',
                onViewAll: () => context.push(AppRoutes.communityFeed),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: AppSpacing.space3,
              ),
              child: ItineraryCard(
                title: '3 ngày Đà Nẵng - Hội An',
                imageUrl: 'https://picsum.photos/seed/itin1/400/200',
                numDays: 3,
                authorName: 'Minh Tú',
                onTap: () {},
              ),
            ),
          ),

          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: AppSpacing.layoutXl),
          ),
        ],
      ),
    );
  }
}

/// Row: greeting + avatar + bell
class _GreetingRow extends StatelessWidget {
  const _GreetingRow({
    required this.userName,
    this.avatarUrl,
    required this.onNotificationTap,
  });

  final String userName;
  final String? avatarUrl;
  final VoidCallback onNotificationTap;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Chào buổi sáng,';
    if (hour < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _greeting,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            Text(
              userName,
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        const Spacer(),
        // Bell icon
        IconButton(
          onPressed: onNotificationTap,
          icon: const Icon(
            Icons.notifications_outlined,
            color: AppColors.textPrimary,
          ),
        ),
        // Avatar
        CircleAvatar(
          radius: 18,
          backgroundColor: SagePalette.sage200,
          backgroundImage:
              avatarUrl != null ? NetworkImage(avatarUrl!) : null,
          child: avatarUrl == null
              ? const Icon(Icons.person_rounded,
                  size: 18, color: AppColors.textSecondary)
              : null,
        ),
      ],
    );
  }
}

/// Quick actions row: 4 shortcuts
class _QuickActionsRow extends StatelessWidget {
  const _QuickActionsRow();

  static const _actions = [
    (icon: Icons.calendar_today_rounded, label: 'Lập lịch', color: AppColors.actionPrimary),
    (icon: Icons.map_rounded, label: 'Bản đồ', color: AppColors.actionSecondary),
    (icon: Icons.smart_toy_rounded, label: 'Hỏi AI', color: SagePalette.sage500),
    (icon: Icons.star_rounded, label: 'VIP', color: AppColors.actionPrimary),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.layoutSm,
        vertical: AppSpacing.layoutSm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: _actions.map((a) {
          return GestureDetector(
            onTap: () {},
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: a.color.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(a.icon, color: a.color, size: 26),
                ),
                const SizedBox(height: AppSpacing.space1),
                Text(
                  a.label,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Onboarding prompt card (dismissible)
class _OnboardingPromptCard extends StatelessWidget {
  const _OnboardingPromptCard({
    required this.onDismiss,
    required this.onAction,
  });

  final VoidCallback onDismiss;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.space4),
        decoration: BoxDecoration(
          color: SagePalette.sage100,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: SagePalette.sage300),
        ),
        child: Row(
          children: [
            const Icon(Icons.explore_outlined, color: AppColors.actionSecondary),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cá nhân hóa gợi ý',
                    style: AppTextStyles.bodySm.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Chọn phong cách du lịch để nhận gợi ý phù hợp',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(48, 36),
              ),
              child: Text(
                'Chọn →',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.actionPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            IconButton(
              onPressed: onDismiss,
              icon: const Icon(Icons.close, size: 16, color: AppColors.textSecondary),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        ),
      ),
    );
  }
}

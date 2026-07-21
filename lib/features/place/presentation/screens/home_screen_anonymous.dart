import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../shared/widgets/molecules/place_card.dart';
import '../../../../shared/widgets/molecules/section_header.dart';
import '../../../../shared/widgets/organisms/search_bar_widget.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-11: HomeScreen (anonymous)
/// Variant của HomeScreen — thay greeting bằng login button,
/// thêm LoginPromptBanner, bỏ OnboardingPromptCard
/// ═══════════════════════════════════════════════════════

class HomeScreenAnonymous extends StatelessWidget {
  const HomeScreenAnonymous({super.key});

  static const _demoPlaces = [
    (
      name: 'Bãi biển Mỹ Khê',
      category: 'beach',
      rating: 4.7,
      imageUrl: 'https://picsum.photos/seed/mykhe/320/240',
      duration: 180,
      fee: 0,
    ),
    (
      name: 'Ngũ Hành Sơn',
      category: 'mountain',
      rating: 4.5,
      imageUrl: 'https://picsum.photos/seed/ngu/320/240',
      duration: 120,
      fee: 40000,
    ),
    (
      name: 'Cầu Rồng',
      category: 'viewpoint',
      rating: 4.8,
      imageUrl: 'https://picsum.photos/seed/dragon/320/240',
      duration: 60,
      fee: 0,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // ── AppBar: greeting + login button ──
          SliverAppBar(
            pinned: true,
            expandedHeight: 0,
            backgroundColor: AppColors.backgroundPrimary,
            surfaceTintColor: Colors.transparent,
            title: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Khám phá Đà Nẵng 👋',
                        style: AppTextStyles.h4.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () {
                    // TODO: navigate to LoginScreen
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.actionPrimary,
                    foregroundColor: AppColors.textOnPrimary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space3,
                      vertical: AppSpacing.space2,
                    ),
                    shape: const StadiumBorder(),
                  ),
                  child: Text(
                    'Đăng nhập',
                    style: AppTextStyles.bodySm.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textOnPrimary,
                    ),
                  ),
                ),
              ],
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
                onTap: () {},
              ),
            ),
          ),

          // ── Login prompt banner ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: AppSpacing.space2,
              ),
              child: _LoginPromptBanner(
                onLogin: () {
                  // TODO: navigate to LoginScreen
                },
              ),
            ),
          ),

          // ── Địa điểm phổ biến ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                AppSpacing.layoutSm,
                0,
              ),
              child: SectionHeader(
                title: 'Địa điểm phổ biến',
                onViewAll: () {},
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: SizedBox(
              height: 220,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.layoutSm,
                  vertical: AppSpacing.space2,
                ),
                itemCount: _demoPlaces.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(width: AppSpacing.space3),
                itemBuilder: (_, i) {
                  final p = _demoPlaces[i];
                  return PlaceCard(
                    name: p.name,
                    imageUrl: p.imageUrl,
                    category: p.category,
                    rating: p.rating,
                    durationMin: p.duration,
                    entryFee: p.fee,
                    onTap: () {},
                  );
                },
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.layoutXl)),
        ],
      ),
    );
  }
}

/// Login prompt banner — sage.200, key icon, amber CTA
class _LoginPromptBanner extends StatelessWidget {
  const _LoginPromptBanner({required this.onLogin});
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.space4),
      decoration: BoxDecoration(
        color: SagePalette.sage200,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.key_rounded, color: AppColors.actionSecondary, size: 24),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Text(
              'Đăng nhập để lưu lịch trình và cá nhân hóa gợi ý',
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.space2),
          ElevatedButton(
            onPressed: onLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.actionPrimary,
              foregroundColor: AppColors.textOnPrimary,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space3),
              shape: const StadiumBorder(),
              elevation: 0,
            ),
            child: Text(
              'Đăng nhập',
              style: AppTextStyles.caption.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textOnPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

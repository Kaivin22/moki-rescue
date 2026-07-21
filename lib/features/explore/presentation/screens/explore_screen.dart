import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/molecules/itinerary_card.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../features/itinerary/presentation/providers/itinerary_providers.dart';
import '../../../../features/itinerary/domain/models/itinerary.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-12: ExploreScreen
/// TabController 4 tabs: Tất cả | Phổ biến | Mới nhất | Gần tôi
/// Mỗi tab: RefreshIndicator + ListView ItineraryCards + infinite scroll
/// ═══════════════════════════════════════════════════════

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _tabs = ['Tất cả', 'Phổ biến', 'Mới nhất', 'Gần tôi'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(publicItinerariesProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Khám phá',
          style: AppTextStyles.h3.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelStyle:
              AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w700),
          unselectedLabelStyle: AppTextStyles.bodyMd,
          labelColor: AppColors.actionPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.actionPrimary,
          indicatorWeight: 2,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _tabs.map((_) => feedAsync.when(
          loading: () => const LoadingShimmerList(
            variant: ShimmerVariant.itineraryCard,
            itemCount: 4,
          ),
          error: (e, _) => EmptyState(type: EmptyStateType.noTrips),
          data: (items) => _ItineraryTabView(
            itineraries: items,
            onTap: (id) => context.push(
              AppRoutes.publicItinerary,
              extra: id,
            ),
          ),
        )).toList(),
      ),
    );
  }
}

class _ItineraryTabView extends StatefulWidget {
  const _ItineraryTabView({
    required this.itineraries,
    required this.onTap,
  });

  final List<Itinerary> itineraries;
  final ValueChanged<String> onTap;

  @override
  State<_ItineraryTabView> createState() => _ItineraryTabViewState();
}

class _ItineraryTabViewState extends State<_ItineraryTabView> {
  Future<void> _onRefresh() async {
    await Future.delayed(const Duration(seconds: 1));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.itineraries.isEmpty) {
      return EmptyState(
        type: EmptyStateType.noTrips,
        actionLabel: 'Tạo lịch trình',
        onAction: () {},
      );
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: AppColors.actionPrimary,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.layoutSm),
        itemCount: widget.itineraries.length,
        separatorBuilder: (_, index) =>
            const SizedBox(height: AppSpacing.space3),
        itemBuilder: (_, i) {
          final it = widget.itineraries[i];
          return ItineraryCard(
            title: it.title,
            imageUrl: it.thumbnailUrl ?? '',
            numDays: it.numDays,
            authorName: it.authorName ?? '',
            viewCount: it.likeCount,
            onTap: () => widget.onTap(it.id),
          );
        },
      ),
    );
  }
}

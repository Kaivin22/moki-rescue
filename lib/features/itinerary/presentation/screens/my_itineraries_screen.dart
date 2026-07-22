import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/molecules/itinerary_card.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/atoms/status_badge.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../providers/itinerary_providers.dart';
import '../../domain/models/itinerary.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-28: MyItinerariesScreen
/// Tab: Của tôi | Đã lưu | Lịch sử
/// Filter chips + ItineraryCard grid
/// ═══════════════════════════════════════════════════════

class MyItinerariesScreen extends ConsumerStatefulWidget {
  const MyItinerariesScreen({super.key});

  @override
  ConsumerState<MyItinerariesScreen> createState() =>
      _MyItinerariesScreenState();
}

class _MyItinerariesScreenState extends ConsumerState<MyItinerariesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final myAsync = ref.watch(myItinerariesProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Lịch trình của tôi',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => context.push(AppRoutes.createItinerary),
            tooltip: 'Tạo lịch trình mới',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.actionPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.actionPrimary,
          indicatorWeight: 2,
          labelStyle: AppTextStyles.bodyMd.copyWith(
            fontWeight: FontWeight.w600,
          ),
          tabs: const [
            Tab(text: 'Của tôi'),
            Tab(text: 'Đã lưu'),
            Tab(text: 'Lịch sử'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Tab 0: My itineraries ──
          myAsync.when(
            loading: () => const LoadingShimmerList(
              variant: ShimmerVariant.itineraryCard,
              itemCount: 3,
            ),
            error: (e, _) => EmptyState(type: EmptyStateType.noTrips),
            data: (list) => _MyTab(
              itineraries: list,
              onTap: (id) => context.push(AppRoutes.itineraryDetail, extra: id),
            ),
          ),
          // ── Tab 1: Saved (placeholder) ──
          EmptyState(type: EmptyStateType.noTrips),
          // ── Tab 2: History ──
          EmptyState(type: EmptyStateType.noTrips),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.createItinerary),
        backgroundColor: AppColors.actionPrimary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: Text(
          'Tạo mới',
          style: AppTextStyles.bodyMd.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _MyTab extends StatelessWidget {
  const _MyTab({required this.itineraries, required this.onTap});
  final List<Itinerary> itineraries;
  final void Function(String id) onTap;

  @override
  Widget build(BuildContext context) {
    if (itineraries.isEmpty) return EmptyState(type: EmptyStateType.noTrips);

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.layoutSm),
      itemCount: itineraries.length,
      separatorBuilder: (_, index) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) {
        final it = itineraries[i];
        return Stack(
          children: [
            ItineraryCard(
              title: it.title,
              imageUrl: it.thumbnailUrl ?? '',
              numDays: it.numDays,
              authorName: 'Bạn',
              onTap: () => onTap(it.id),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: StatusBadge(
                type: it.isPublic ? StatusType.published : StatusType.draft,
              ),
            ),
          ],
        );
      },
    );
  }
}

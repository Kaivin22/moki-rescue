import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/molecules/itinerary_card.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-45: UserPublicProfileScreen
/// View another user's public profile
/// Avatar + stats + public itineraries grid
/// ═══════════════════════════════════════════════════════

class UserPublicProfileScreen extends StatefulWidget {
  const UserPublicProfileScreen({
    super.key,
    required this.userId,
    required this.displayName,
    this.avatarUrl,
  });

  final String userId;
  final String displayName;
  final String? avatarUrl;

  @override
  State<UserPublicProfileScreen> createState() => _UserPublicProfileScreenState();
}

class _UserPublicProfileScreenState extends State<UserPublicProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _isFollowing = false;

  static const _mockItineraries = [
    (
      id: 'i1',
      title: '3 ngày Đà Nẵng chill',
      imageUrl: 'https://picsum.photos/seed/f1/400/200',
      numDays: 3,
      likes: 48,
      saves: 24,
    ),
    (
      id: 'i2',
      title: 'Hội An 2 ngày lang thang',
      imageUrl: 'https://picsum.photos/seed/f2/400/200',
      numDays: 2,
      likes: 127,
      saves: 89,
    ),
    (
      id: 'i3',
      title: 'Bà Nà Hills full day',
      imageUrl: 'https://picsum.photos/seed/f3/400/200',
      numDays: 1,
      likes: 56,
      saves: 31,
    ),
    (
      id: 'i4',
      title: '5 ngày khám phá miền Trung',
      imageUrl: 'https://picsum.photos/seed/f4/400/200',
      numDays: 5,
      likes: 203,
      saves: 145,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: NestedScrollView(
        headerSliverBuilder: (_, _) => [
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: AppColors.backgroundPrimary,
            actions: [
              IconButton(icon: const Icon(Icons.more_vert_rounded), onPressed: () {}),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: CachedNetworkImage(
                imageUrl: 'https://picsum.photos/seed/cover2/400/200',
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(color: SagePalette.sage200),
                errorWidget: (_, _, _) => Container(color: SagePalette.sage300),
              ),
            ),
          ),
        ],
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Profile info ──
              Padding(
                padding: const EdgeInsets.all(AppSpacing.layoutSm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: SagePalette.sage200,
                          backgroundImage: CachedNetworkImageProvider(
                            widget.avatarUrl ?? 'https://picsum.photos/seed/u6/80/80',
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(widget.displayName, style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700)),
                              Text('@${widget.userId}', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        AppButton(
                          label: _isFollowing ? 'Đang theo dõi' : 'Theo dõi',
                          variant: _isFollowing ? AppButtonVariant.secondary : AppButtonVariant.primary,
                          isExpanded: false,
                          onPressed: () => setState(() => _isFollowing = !_isFollowing),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.space3),
                    Text(
                      'Yêu thích khám phá biển và núi. Đã đi 12 tỉnh 🗺',
                      style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: AppSpacing.layoutSm),
                    // Stats
                    Row(
                      children: [
                        _MiniStat(value: '${_mockItineraries.length}', label: 'Lịch trình'),
                        const SizedBox(width: AppSpacing.layoutMd),
                        _MiniStat(value: '342', label: 'Người theo dõi'),
                        const SizedBox(width: AppSpacing.layoutMd),
                        _MiniStat(value: '128', label: 'Đang theo dõi'),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Tab bar ──
              TabBar(
                controller: _tabController,
                labelColor: AppColors.actionPrimary,
                unselectedLabelColor: AppColors.textSecondary,
                indicatorColor: AppColors.actionPrimary,
                indicatorWeight: 2,
                labelStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
                tabs: const [
                  Tab(text: 'Lịch trình'),
                  Tab(text: 'Đánh giá'),
                ],
              ),

              // ── Tab content ──
              SizedBox(
                height: 500,
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Itineraries grid
                    _mockItineraries.isEmpty
                        ? EmptyState(type: EmptyStateType.noTrips)
                        : GridView.builder(
                            padding: const EdgeInsets.all(AppSpacing.layoutSm),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: AppSpacing.space3,
                              mainAxisSpacing: AppSpacing.space3,
                              childAspectRatio: 0.72,
                            ),
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                            itemCount: _mockItineraries.length,
                            itemBuilder: (_, i) {
                              final it = _mockItineraries[i];
                              return ItineraryCard(
                                title: it.title,
                                imageUrl: it.imageUrl,
                                numDays: it.numDays,
                                onTap: () {},
                              );
                            },
                          ),
                    // Reviews tab placeholder
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppSpacing.layoutXl),
                        child: Text('Chưa có đánh giá công khai'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700, color: AppColors.actionPrimary)),
          Text(label, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
        ],
      );
}

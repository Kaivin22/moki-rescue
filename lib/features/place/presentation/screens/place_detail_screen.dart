import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/rating_bar.dart';
import '../../../../shared/widgets/atoms/status_badge.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/atoms/category_icon.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-18: PlaceDetailScreen — Overview Tab
/// NestedScrollView + SliverAppBar 260px + 3 tabs
/// ═══════════════════════════════════════════════════════

class PlaceDetailScreen extends StatefulWidget {
  const PlaceDetailScreen({
    super.key,
    required this.placeId,
    this.placeName,
    this.imageUrl,
  });

  final String placeId;
  final String? placeName;
  final String? imageUrl;

  @override
  State<PlaceDetailScreen> createState() => _PlaceDetailScreenState();
}

class _PlaceDetailScreenState extends State<PlaceDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _isSaved = false;
  bool _isAdded = false;

  // Demo data
  static const _demoImages = [
    'https://picsum.photos/seed/place1/400/300',
    'https://picsum.photos/seed/place2/400/300',
    'https://picsum.photos/seed/place3/400/300',
  ];

  static const _suitableFor = ['Cặp đôi', 'Gia đình', 'Nhóm bạn'];
  static const _tags = ['Bãi biển', 'Thiên nhiên', 'Nổi tiếng', 'Chụp ảnh'];
  static const _bestMonths = ['3', '4', '5', '6', '7', '8'];

  int _currentImagePage = 0;

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
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: NestedScrollView(
        headerSliverBuilder: (_, innerScrolled) => [
          // ── SliverAppBar: hero images ──
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.arrow_back_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              onPressed: () => Navigator.maybePop(context),
            ),
            actions: [
              // Share
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
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
              // Save heart
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isSaved
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: _isSaved ? Colors.red : Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () => setState(() => _isSaved = !_isSaved),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // PageView images
                  PageView.builder(
                    itemCount: _demoImages.length,
                    onPageChanged: (i) => setState(() => _currentImagePage = i),
                    itemBuilder: (_, i) => CachedNetworkImage(
                      imageUrl: _demoImages[i],
                      fit: BoxFit.cover,
                      placeholder: (_, _) =>
                          Container(color: SagePalette.sage200),
                      errorWidget: (_, _, _) =>
                          Container(color: SagePalette.sage300),
                    ),
                  ),
                  // Dots indicator
                  Positioned(
                    bottom: AppSpacing.space3,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_demoImages.length, (i) {
                        return Container(
                          width: i == _currentImagePage ? 16 : 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: i == _currentImagePage
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        body: Column(
          children: [
            // ── Place info section ──
            Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category + verified badge
                  Row(
                    children: [
                      CategoryIcon(
                        category: 'beach',
                        size: CategoryIconSize.sm,
                      ),
                      const SizedBox(width: AppSpacing.space2),
                      StatusBadge(label: 'Đã xác minh', type: StatusType.open),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // Place name
                  Text(
                    widget.placeName ?? 'Bãi biển Mỹ Khê',
                    style: AppTextStyles.h2.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // Rating bar
                  RatingBar(
                    rating: 4.7,
                    reviewCount: 142,
                    variant: RatingBarVariant.compact,
                  ),

                  const SizedBox(height: AppSpacing.space3),

                  // Info chips row
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: [
                      _InfoChip(
                        icon: '💰',
                        label: 'Miễn phí',
                        color: AppColors.actionPrimary,
                      ),
                      _InfoChip(
                        icon: '⏱',
                        label: '2-3 giờ',
                        color: AppColors.textSecondary,
                      ),
                      _InfoChip(
                        icon: '📍',
                        label: 'Sơn Trà, Đà Nẵng',
                        color: AppColors.textSecondary,
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.space3),

                  // Phone
                  _InfoRow(
                    icon: Icons.phone_outlined,
                    text: '0236 1234 567',
                    isLink: true,
                  ),

                  const SizedBox(height: AppSpacing.space2),

                  // Hours + status
                  _InfoRow(
                    icon: Icons.schedule_outlined,
                    text: '05:00 - 22:00',
                    trailing: StatusBadge(
                      label: 'Đang mở',
                      type: StatusType.open,
                    ),
                  ),

                  const SizedBox(height: AppSpacing.space3),

                  // Opening days
                  _OpeningDaysRow(openDays: {1, 2, 3, 4, 5, 6, 7}),
                ],
              ),
            ),

            // ── TabBar ──
            TabBar(
              controller: _tabController,
              labelColor: AppColors.actionPrimary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.actionPrimary,
              indicatorWeight: 2,
              labelStyle: AppTextStyles.bodyMd.copyWith(
                fontWeight: FontWeight.w600,
              ),
              tabs: const [
                Tab(text: 'Tổng quan'),
                Tab(text: 'Đánh giá'),
                Tab(text: 'Mẹo hay'),
              ],
            ),

            // ── TabBarView ──
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 0: Overview
                  _OverviewTab(
                    suitableFor: _suitableFor,
                    tags: _tags,
                    bestMonths: _bestMonths,
                  ),
                  // Tab 1: Reviews (placeholder)
                  const Center(child: Text('Đánh giá...')),
                  // Tab 2: Tips (placeholder)
                  const Center(child: Text('Mẹo hay...')),
                ],
              ),
            ),
          ],
        ),
      ),
      // ── Bottom sticky CTA ──
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.layoutSm),
          child: AppButton(
            label: _isAdded
                ? '✓ Đã thêm vào lịch trình'
                : 'Thêm vào lịch trình',
            variant: _isAdded
                ? AppButtonVariant.secondary
                : AppButtonVariant.primary,
            onPressed: () => setState(() => _isAdded = !_isAdded),
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });
  final String icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: AppColors.backgroundSecondary,
      borderRadius: AppRadius.chipBorder,
      border: Border.all(color: AppColors.borderDefault),
    ),
    child: Text(
      '$icon $label',
      style: AppTextStyles.caption.copyWith(
        color: color,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.text,
    this.isLink = false,
    this.trailing,
  });
  final IconData icon;
  final String text;
  final bool isLink;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 18, color: AppColors.textSecondary),
      const SizedBox(width: AppSpacing.space2),
      Expanded(
        child: Text(
          text,
          style: AppTextStyles.bodyMd.copyWith(
            color: isLink ? AppColors.actionSecondary : AppColors.textPrimary,
            decoration: isLink ? TextDecoration.underline : null,
            decorationColor: isLink ? AppColors.actionSecondary : null,
          ),
        ),
      ),
      ?trailing,
    ],
  );
}

class _OpeningDaysRow extends StatelessWidget {
  const _OpeningDaysRow({required this.openDays});
  final Set<int> openDays; // 1=Mon ... 7=Sun

  static const _labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  @override
  Widget build(BuildContext context) => Row(
    children: List.generate(7, (i) {
      final day = i + 1;
      final isOpen = openDays.contains(day);
      return Expanded(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          height: 32,
          decoration: BoxDecoration(
            color: isOpen ? AppColors.actionPrimary : SagePalette.sage200,
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: Text(
            _labels[i],
            style: AppTextStyles.caption.copyWith(
              color: isOpen ? AppColors.textOnPrimary : AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              fontSize: 10,
            ),
          ),
        ),
      );
    }),
  );
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.suitableFor,
    required this.tags,
    required this.bestMonths,
  });

  final List<String> suitableFor;
  final List<String> tags;
  final List<String> bestMonths;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(AppSpacing.layoutSm),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Mô tả',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.space2),
        Text(
          'Bãi biển Mỹ Khê là một trong những bãi biển đẹp nhất Đà Nẵng với bờ cát trắng dài hơn 9km. Nước biển trong xanh, sóng nhỏ phù hợp cho tắm biển và các hoạt động thể thao nước.',
          style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.layoutSm),
        Text(
          'Phù hợp với',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.space2),
        Wrap(
          spacing: AppSpacing.space2,
          runSpacing: AppSpacing.space2,
          children: suitableFor.map((s) => TagChip(label: s)).toList(),
        ),
        const SizedBox(height: AppSpacing.layoutSm),
        Text(
          'Tags',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.space2),
        Wrap(
          spacing: AppSpacing.space2,
          runSpacing: AppSpacing.space2,
          children: tags
              .map(
                (t) => TagChip(label: t, variant: TagChipVariant.displayOnly),
              )
              .toList(),
        ),
        const SizedBox(height: AppSpacing.layoutSm),
        Text(
          'Tháng tốt nhất để đến',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.space2),
        Wrap(
          spacing: AppSpacing.space2,
          runSpacing: AppSpacing.space2,
          children: bestMonths
              .map(
                (m) => Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AmberPalette.amber100,
                    borderRadius: AppRadius.chipBorder,
                  ),
                  child: Text(
                    'Tháng $m',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.actionPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: AppSpacing.layoutMd),
      ],
    ),
  );
}

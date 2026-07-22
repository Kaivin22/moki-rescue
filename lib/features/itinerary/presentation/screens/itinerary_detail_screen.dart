import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/status_badge.dart';
import '../../../../shared/widgets/molecules/place_timeline_tile.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-27: ItineraryDetailScreen
/// SliverAppBar hero + Tab: Lịch trình | Bản đồ | Chi tiết
/// Per-day timeline, QR share, clone button
/// ═══════════════════════════════════════════════════════

class ItineraryDetailScreen extends StatefulWidget {
  const ItineraryDetailScreen({
    super.key,
    required this.itineraryId,
    this.title,
    this.imageUrl,
    this.isOwner = false,
  });

  final String itineraryId;
  final String? title;
  final String? imageUrl;
  final bool isOwner;

  @override
  State<ItineraryDetailScreen> createState() => _ItineraryDetailScreenState();
}

class _ItineraryDetailScreenState extends State<ItineraryDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _isSaved = false;
  int _selectedDay = 0;

  static const _numDays = 3;
  static const _daySchedules = [
    [
      (
        name: 'Bãi biển Mỹ Khê',
        emoji: '🏖',
        timeStart: '07:00',
        durationMin: 120,
      ),
      (name: 'Ngũ Hành Sơn', emoji: '⛰', timeStart: '10:00', durationMin: 90),
      (
        name: 'Bữa trưa - Bún mắm',
        emoji: '🍜',
        timeStart: '12:30',
        durationMin: 60,
      ),
      (
        name: 'Phố cổ Hội An',
        emoji: '🏮',
        timeStart: '14:30',
        durationMin: 180,
      ),
    ],
    [
      (name: 'Bà Nà Hills', emoji: '🎡', timeStart: '08:00', durationMin: 360),
      (name: 'Cầu Vàng', emoji: '🌉', timeStart: '09:00', durationMin: 60),
    ],
    [
      (
        name: 'Bán đảo Sơn Trà',
        emoji: '🌿',
        timeStart: '07:00',
        durationMin: 180,
      ),
      (name: 'Cầu Rồng', emoji: '🐉', timeStart: '11:00', durationMin: 45),
      (name: 'Chợ Hàn', emoji: '🏪', timeStart: '14:00', durationMin: 120),
    ],
  ];

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
        headerSliverBuilder: (_, _) => [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.backgroundPrimary,
            foregroundColor: AppColors.textPrimary,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
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
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
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
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isSaved
                        ? Icons.bookmark_rounded
                        : Icons.bookmark_border_rounded,
                    color: _isSaved ? AppColors.actionPrimary : Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () => setState(() => _isSaved = !_isSaved),
              ),
              if (widget.isOwner)
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.edit_outlined,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  onPressed: () {},
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: CachedNetworkImage(
                imageUrl:
                    widget.imageUrl ??
                    'https://picsum.photos/seed/itin1/400/220',
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(color: SagePalette.sage200),
                errorWidget: (_, _, _) => Container(color: SagePalette.sage300),
              ),
            ),
          ),
        ],
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Info section ──
            Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title + badge
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.title ?? '3 ngày Đà Nẵng - Hội An',
                          style: AppTextStyles.h3.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (widget.isOwner)
                        const Padding(
                          padding: EdgeInsets.only(left: AppSpacing.space2),
                          child: StatusBadge(type: StatusType.draft),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  // Meta row
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: AppSpacing.space1),
                      Text(
                        '$_numDays ngày',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.space3),
                      Icon(
                        Icons.place_rounded,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: AppSpacing.space1),
                      Text(
                        '9 địa điểm',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.space3),
                      Icon(
                        Icons.visibility_outlined,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: AppSpacing.space1),
                      Text(
                        '1.2K lượt xem',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
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
                Tab(text: 'Lịch trình'),
                Tab(text: 'Bản đồ'),
                Tab(text: 'Chi tiết'),
              ],
            ),

            // ── TabBarView ──
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 0: Timeline
                  _TimelineTab(
                    numDays: _numDays,
                    daySchedules: _daySchedules,
                    selectedDay: _selectedDay,
                    onDaySelected: (d) => setState(() => _selectedDay = d),
                  ),
                  // Tab 1: Map placeholder
                  const Center(
                    child: Icon(
                      Icons.map_rounded,
                      size: 64,
                      color: SagePalette.sage300,
                    ),
                  ),
                  // Tab 2: Details
                  _DetailsTab(isOwner: widget.isOwner),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.layoutSm),
          child: widget.isOwner
              ? AppButton(label: '📤 Chia sẻ lịch trình', onPressed: () {})
              : AppButton(
                  label: '📋 Sao chép lịch trình này',
                  onPressed: () {},
                ),
        ),
      ),
    );
  }
}

class _TimelineTab extends StatelessWidget {
  const _TimelineTab({
    required this.numDays,
    required this.daySchedules,
    required this.selectedDay,
    required this.onDaySelected,
  });

  final int numDays;
  final List<
    List<({String name, String emoji, String timeStart, int durationMin})>
  >
  daySchedules;
  final int selectedDay;
  final ValueChanged<int> onDaySelected;

  @override
  Widget build(BuildContext context) {
    final current = selectedDay < daySchedules.length
        ? daySchedules[selectedDay]
        : [];

    return Column(
      children: [
        // Day tabs
        SizedBox(
          height: 44,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.layoutSm,
            ),
            itemCount: numDays,
            itemBuilder: (_, i) {
              final isActive = selectedDay == i;
              return GestureDetector(
                onTap: () => onDaySelected(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isActive
                        ? AppColors.actionPrimary
                        : AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      'Ngày ${i + 1}',
                      style: AppTextStyles.bodySm.copyWith(
                        color: isActive
                            ? AppColors.textOnPrimary
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: AppSpacing.space2),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.layoutSm,
            ),
            itemCount: current.length,
            itemBuilder: (_, i) {
              final p = current[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                child: PlaceTimelineTile(
                  placeName: '${p.emoji} ${p.name}',
                  arrivalTime: p.timeStart,
                  durationMin: p.durationMin,
                  isLast: i == current.length - 1,
                  onTap: () {},
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DetailsTab extends StatelessWidget {
  const _DetailsTab({required this.isOwner});
  final bool isOwner;

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
          'Hành trình khám phá Đà Nẵng và Hội An trong 3 ngày trọn vẹn, kết hợp biển, núi và di sản văn hóa.',
          style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.layoutSm),
        Text(
          'Ngân sách ước tính',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: AppSpacing.space2),
        _BudgetRow(label: 'Di chuyển', amount: 450000),
        _BudgetRow(label: 'Vé tham quan', amount: 870000),
        _BudgetRow(label: 'Ăn uống', amount: 600000),
        _BudgetRow(label: 'Lưu trú', amount: 1500000),
        const Divider(height: 24),
        _BudgetRow(label: 'Tổng cộng', amount: 3420000, isBold: true),
      ],
    ),
  );
}

class _BudgetRow extends StatelessWidget {
  const _BudgetRow({
    required this.label,
    required this.amount,
    this.isBold = false,
  });
  final String label;
  final int amount;
  final bool isBold;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.space2),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.bodyMd.copyWith(
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
            color: AppColors.textPrimary,
          ),
        ),
        Text(
          '${(amount / 1000).round()}k đ',
          style: AppTextStyles.bodyMd.copyWith(
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            color: isBold ? AppColors.actionPrimary : AppColors.textPrimary,
          ),
        ),
      ],
    ),
  );
}

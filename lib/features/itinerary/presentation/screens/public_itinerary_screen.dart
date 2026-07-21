import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/place_timeline_tile.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-43: PublicItineraryScreen
/// View a shared itinerary from another user (read-only)
/// Author card + day tabs + timeline + Clone CTA
/// ═══════════════════════════════════════════════════════

class PublicItineraryScreen extends StatefulWidget {
  const PublicItineraryScreen({
    super.key,
    required this.itineraryId,
    this.shareToken,
  });

  final String itineraryId;
  final String? shareToken;

  @override
  State<PublicItineraryScreen> createState() => _PublicItineraryScreenState();
}

class _PublicItineraryScreenState extends State<PublicItineraryScreen> {
  int _selectedDay = 0;
  bool _isSaved = false;

  static const _numDays = 3;
  static const _daySchedules = [
    [
      (name: 'Bãi biển Mỹ Khê', emoji: '🏖', timeStart: '07:00', durationMin: 120),
      (name: 'Ngũ Hành Sơn', emoji: '⛰', timeStart: '10:00', durationMin: 90),
      (name: 'Mì Quảng Bà Mua', emoji: '🍜', timeStart: '12:30', durationMin: 60),
      (name: 'Phố cổ Hội An', emoji: '🏮', timeStart: '14:30', durationMin: 180),
    ],
    [
      (name: 'Bà Nà Hills', emoji: '🎡', timeStart: '07:30', durationMin: 360),
      (name: 'Cầu Vàng', emoji: '🌉', timeStart: '09:00', durationMin: 60),
    ],
    [
      (name: 'Bán đảo Sơn Trà', emoji: '🌿', timeStart: '06:30', durationMin: 180),
      (name: 'Cầu Rồng', emoji: '🐉', timeStart: '11:00', durationMin: 45),
      (name: 'Chợ Hàn', emoji: '🏪', timeStart: '14:00', durationMin: 120),
    ],
  ];

  static const _tags = ['Gia đình', 'Biển', 'Di sản', 'Ẩm thực'];

  @override
  Widget build(BuildContext context) {
    final current = _daySchedules[_selectedDay];

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // ── SliverAppBar hero ──
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.backgroundPrimary,
            foregroundColor: AppColors.textPrimary,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
              ),
              onPressed: () => Navigator.maybePop(context),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                  child: const Icon(Icons.share_outlined, color: Colors.white, size: 20),
                ),
                onPressed: () {},
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                  child: Icon(
                    _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                    color: _isSaved ? AppColors.actionPrimary : Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () => setState(() => _isSaved = !_isSaved),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: CachedNetworkImage(
                imageUrl: 'https://picsum.photos/seed/pub1/400/220',
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(color: SagePalette.sage300),
                errorWidget: (_, _, _) => Container(color: SagePalette.sage400),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Title + meta ──
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.layoutSm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '3 ngày Đà Nẵng - Hội An trọn vẹn',
                        style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSpacing.space2),
                      Row(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Text('$_numDays ngày', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                          const SizedBox(width: AppSpacing.space3),
                          Icon(Icons.place_rounded, size: 13, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Text('9 địa điểm', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                          const SizedBox(width: AppSpacing.space3),
                          Icon(Icons.favorite_rounded, size: 13, color: AppColors.statusError),
                          const SizedBox(width: 4),
                          Text('127 lượt lưu', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.space3),
                      // Tags
                      Wrap(
                        spacing: AppSpacing.space2,
                        children: _tags.map((t) => TagChip(label: t, variant: TagChipVariant.displayOnly)).toList(),
                      ),
                    ],
                  ),
                ),

                // ── Author card ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.space3),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSecondary,
                      borderRadius: AppRadius.cardBorder,
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: SagePalette.sage200,
                          backgroundImage: const CachedNetworkImageProvider(
                              'https://picsum.photos/seed/u6/80/80'),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TravelVlog Vietnam',
                                  style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600)),
                              Text('48 lịch trình · 1.2K người theo dõi',
                                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        AppButton(
                          label: 'Theo dõi',
                          isExpanded: false,
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutSm),

                // ── Day tabs ──
                SizedBox(
                  height: 44,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm, vertical: 4),
                    itemCount: _numDays,
                    itemBuilder: (_, i) {
                      final isActive = _selectedDay == i;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedDay = i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: isActive ? AppColors.actionPrimary : AppColors.backgroundSecondary,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isActive ? AppColors.actionPrimary : AppColors.borderDefault,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              'Ngày ${i + 1}',
                              style: AppTextStyles.bodySm.copyWith(
                                color: isActive ? AppColors.textOnPrimary : AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: AppSpacing.space3),

                // ── Timeline (read-only) ──
                ...current.asMap().entries.map((e) {
                  final i = e.key;
                  final p = e.value;
                  return Padding(
                    padding: const EdgeInsets.only(
                      left: AppSpacing.layoutSm,
                      right: AppSpacing.layoutSm,
                      bottom: AppSpacing.space2,
                    ),
                    child: PlaceTimelineTile(
                      placeName: '${p.emoji} ${p.name}',
                      arrivalTime: p.timeStart,
                      durationMin: p.durationMin,
                      isLast: i == current.length - 1,
                    ),
                  );
                }),

                const SizedBox(height: AppSpacing.layoutXl),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.layoutSm),
          child: AppButton(
            label: '📋 Sao chép lịch trình này',
            onPressed: () {},
          ),
        ),
      ),
    );
  }
}

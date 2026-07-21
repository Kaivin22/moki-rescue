import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/molecules/place_timeline_tile.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-26: ArrangeScheduleScreen — Step 3 of 3
/// DayTab selector + DragTarget reorderable day-by-day list
/// ═══════════════════════════════════════════════════════

class ArrangeScheduleScreen extends StatefulWidget {
  const ArrangeScheduleScreen({
    super.key,
    required this.numDays,
    required this.placeIds,
  });

  final int numDays;
  final List<String> placeIds;

  @override
  State<ArrangeScheduleScreen> createState() => _ArrangeScheduleScreenState();
}

class _ArrangeScheduleScreenState extends State<ArrangeScheduleScreen> {
  int _selectedDay = 0;
  late List<List<_SchedulePlace>> _dayPlaces;

  static const _allPlaces = [
    _SchedulePlace(id: 'p1', name: 'Bãi biển Mỹ Khê', emoji: '🏖', timeStart: '07:00', durationMin: 120, category: 'beach'),
    _SchedulePlace(id: 'p2', name: 'Ngũ Hành Sơn', emoji: '⛰', timeStart: '10:00', durationMin: 90, category: 'mountain'),
    _SchedulePlace(id: 'p3', name: 'Phố cổ Hội An', emoji: '🏮', timeStart: '14:00', durationMin: 180, category: 'historical'),
    _SchedulePlace(id: 'p4', name: 'Bà Nà Hills', emoji: '🎡', timeStart: '08:00', durationMin: 360, category: 'entertainment'),
    _SchedulePlace(id: 'p5', name: 'Cầu Vàng', emoji: '🌉', timeStart: '09:00', durationMin: 60, category: 'viewpoint'),
  ];

  @override
  void initState() {
    super.initState();
    // Distribute places across days evenly
    _dayPlaces = List.generate(widget.numDays, (d) {
      return _allPlaces.where((p) => widget.placeIds.contains(p.id)).toList()
          .asMap()
          .entries
          .where((e) => e.key % widget.numDays == d)
          .map((e) => e.value)
          .toList();
    });
    if (_dayPlaces.every((d) => d.isEmpty)) {
      // Demo fallback
      _dayPlaces = [
        [_allPlaces[0], _allPlaces[1]],
        [_allPlaces[2], _allPlaces[3]],
        if (widget.numDays > 2) [_allPlaces[4]],
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentPlaces = _selectedDay < _dayPlaces.length
        ? _dayPlaces[_selectedDay]
        : <_SchedulePlace>[];

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Sắp xếp lịch trình', style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
            Text('Bước 3 / 3 · ${widget.numDays} ngày', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
          ],
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // ── Day tab selector ──
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
              itemCount: widget.numDays,
              itemBuilder: (_, i) {
                final isActive = _selectedDay == i;
                final count = i < _dayPlaces.length ? _dayPlaces[i].length : 0;
                return GestureDetector(
                  onTap: () => setState(() => _selectedDay = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(right: AppSpacing.space2, top: 4, bottom: 4),
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space4),
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.actionPrimary : AppColors.backgroundSecondary,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive ? AppColors.actionPrimary : AppColors.borderDefault,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Ngày ${i + 1}',
                          style: AppTextStyles.bodySm.copyWith(
                            color: isActive ? AppColors.textOnPrimary : AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (count > 0) ...[
                          const SizedBox(width: AppSpacing.space1),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? Colors.white.withValues(alpha: 0.3)
                                  : AppColors.actionPrimary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$count',
                              style: AppTextStyles.caption.copyWith(
                                color: isActive ? Colors.white : AppColors.actionPrimary,
                                fontWeight: FontWeight.w700,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: AppSpacing.space2),

          // ── Reorderable timeline ──
          Expanded(
            child: currentPlaces.isEmpty
                ? Center(
                    child: Text(
                      'Kéo thả địa điểm vào đây',
                      style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
                    ),
                  )
                : ReorderableListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
                    itemCount: currentPlaces.length,
                    onReorder: (old, fresh) {
                      setState(() {
                        final item = _dayPlaces[_selectedDay].removeAt(old);
                        _dayPlaces[_selectedDay].insert(
                          fresh > old ? fresh - 1 : fresh,
                          item,
                        );
                      });
                    },
                    itemBuilder: (_, i) {
                      final place = currentPlaces[i];
                      return Padding(
                        key: ValueKey(place.id + _selectedDay.toString()),
                        padding: const EdgeInsets.only(bottom: AppSpacing.space3),
                        child: PlaceTimelineTile(
                          placeName: '${place.emoji} ${place.name}',
                          arrivalTime: place.timeStart,
                          durationMin: place.durationMin,
                          isLast: i == currentPlaces.length - 1,
                          onTap: () {},
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.layoutMd, 0, AppSpacing.layoutMd, AppSpacing.layoutSm),
          child: AppButton(
            label: 'Tạo lịch trình ✓',
            onPressed: () {},
          ),
        ),
      ),
    );
  }
}

class _SchedulePlace {
  const _SchedulePlace({
    required this.id,
    required this.name,
    required this.emoji,
    required this.timeStart,
    required this.durationMin,
    required this.category,
  });

  final String id;
  final String name;
  final String emoji;
  final String timeStart;
  final int durationMin;
  final String category;
}

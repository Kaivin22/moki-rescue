import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/status_badge.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-46: TripHistoryScreen
/// Danh sách chuyến đi đã qua + filter theo năm
/// Status: completed | cancelled | upcoming
/// ═══════════════════════════════════════════════════════

class TripHistoryScreen extends StatefulWidget {
  const TripHistoryScreen({super.key});

  @override
  State<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends State<TripHistoryScreen> {
  String _selectedYear = '2025';
  String _selectedStatus = 'all';

  static const _years = ['2025', '2024', '2023'];
  static const _statuses = [
    (id: 'all', label: 'Tất cả'),
    (id: 'completed', label: 'Đã đi'),
    (id: 'upcoming', label: 'Sắp tới'),
    (id: 'cancelled', label: 'Đã huỷ'),
  ];

  static final _trips = [
    _TripRecord(
      id: 't1',
      title: '3 ngày Đà Nẵng - Hội An',
      imageUrl: 'https://picsum.photos/seed/f1/400/200',
      dateStart: DateTime(2025, 6, 15),
      dateEnd: DateTime(2025, 6, 17),
      numPlaces: 9,
      status: 'completed',
      totalBudget: 3420000,
      tags: ['Gia đình', 'Biển'],
    ),
    _TripRecord(
      id: 't2',
      title: 'Bà Nà Hills & Cầu Vàng',
      imageUrl: 'https://picsum.photos/seed/f3/400/200',
      dateStart: DateTime(2025, 5, 20),
      dateEnd: DateTime(2025, 5, 20),
      numPlaces: 3,
      status: 'completed',
      totalBudget: 1200000,
      tags: ['Cặp đôi'],
    ),
    _TripRecord(
      id: 't3',
      title: 'Hội An 2 ngày cuối tuần',
      imageUrl: 'https://picsum.photos/seed/f2/400/200',
      dateStart: DateTime(2025, 8, 10),
      dateEnd: DateTime(2025, 8, 11),
      numPlaces: 6,
      status: 'upcoming',
      totalBudget: 2100000,
      tags: ['Nhóm bạn'],
    ),
    _TripRecord(
      id: 't4',
      title: 'Khám phá Sơn Trà',
      imageUrl: 'https://picsum.photos/seed/f4/400/200',
      dateStart: DateTime(2025, 4, 5),
      dateEnd: DateTime(2025, 4, 6),
      numPlaces: 4,
      status: 'cancelled',
      totalBudget: 0,
      tags: ['Leo núi'],
    ),
  ];

  List<_TripRecord> get _filtered => _trips.where((t) {
    final matchYear = t.dateStart.year.toString() == _selectedYear;
    final matchStatus = _selectedStatus == 'all' || t.status == _selectedStatus;
    return matchYear && matchStatus;
  }).toList();

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Lịch sử chuyến đi',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // ── Year selector ──
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: 4,
              ),
              itemCount: _years.length,
              itemBuilder: (_, i) {
                final year = _years[i];
                final isSelected = _selectedYear == year;
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space2),
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedYear = year),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.actionPrimary
                            : AppColors.backgroundSecondary,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.actionPrimary
                              : AppColors.borderDefault,
                        ),
                      ),
                      child: Text(
                        year,
                        style: AppTextStyles.bodyMd.copyWith(
                          color: isSelected
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

          // ── Status filter ──
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
              ),
              itemCount: _statuses.length,
              itemBuilder: (_, i) {
                final s = _statuses[i];
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space2),
                  child: TagChip(
                    label: s.label,
                    isSelected: _selectedStatus == s.id,
                    variant: TagChipVariant.filter,
                    onTap: () => setState(() => _selectedStatus = s.id),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: AppSpacing.space3),

          // ── Summary card ──
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.layoutSm,
            ),
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: AppRadius.cardBorder,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Row(
                children: [
                  _SummaryChip(
                    icon: '🗺',
                    label:
                        '${_trips.where((t) => t.status == 'completed').length} chuyến đi',
                  ),
                  const SizedBox(width: AppSpacing.layoutSm),
                  _SummaryChip(
                    icon: '📍',
                    label:
                        '${_trips.fold(0, (s, t) => s + t.numPlaces)} địa điểm',
                  ),
                  const SizedBox(width: AppSpacing.layoutSm),
                  _SummaryChip(
                    icon: '💰',
                    label:
                        '${(_trips.fold(0, (s, t) => s + t.totalBudget) / 1000000).toStringAsFixed(1)}tr đ',
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space3),

          // ── Trip list ──
          Expanded(
            child: filtered.isEmpty
                ? EmptyState(type: EmptyStateType.noTrips)
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.layoutSm,
                    ),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.space3),
                    itemBuilder: (_, i) => _TripCard(trip: filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _TripRecord {
  const _TripRecord({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.dateStart,
    required this.dateEnd,
    required this.numPlaces,
    required this.status,
    required this.totalBudget,
    required this.tags,
  });
  final String id;
  final String title;
  final String imageUrl;
  final DateTime dateStart;
  final DateTime dateEnd;
  final int numPlaces;
  final String status;
  final int totalBudget;
  final List<String> tags;
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip});
  final _TripRecord trip;

  String get _dateRange {
    if (trip.dateStart == trip.dateEnd) {
      return '${trip.dateStart.day}/${trip.dateStart.month}/${trip.dateStart.year}';
    }
    return '${trip.dateStart.day}/${trip.dateStart.month} – ${trip.dateEnd.day}/${trip.dateEnd.month}/${trip.dateEnd.year}';
  }

  String _formatBudget(int amount) {
    if (amount == 0) return 'N/A';
    return '${(amount / 1000000).toStringAsFixed(1)}tr đ';
  }

  StatusType get _statusType => switch (trip.status) {
    'completed' => StatusType.published,
    'upcoming' => StatusType.draft,
    _ => StatusType.draft,
  };

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: AppColors.backgroundCard,
      borderRadius: AppRadius.cardBorder,
      border: Border.all(color: AppColors.borderDefault),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Image
        ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          child: Stack(
            children: [
              CachedNetworkImage(
                imageUrl: trip.imageUrl,
                height: 140,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (_, _) =>
                    Container(height: 140, color: SagePalette.sage200),
                errorWidget: (_, _, _) =>
                    Container(height: 140, color: SagePalette.sage300),
              ),
              if (trip.status == 'cancelled')
                Container(
                  height: 140,
                  color: Colors.black54,
                  child: const Center(
                    child: Text(
                      'Đã huỷ',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              Positioned(
                top: 8,
                right: 8,
                child: StatusBadge(type: _statusType),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.space3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                trip.title,
                style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.space2),
              Row(
                children: [
                  Icon(
                    Icons.calendar_today_rounded,
                    size: 13,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _dateRange,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space3),
                  Icon(
                    Icons.place_rounded,
                    size: 13,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${trip.numPlaces} điểm',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatBudget(trip.totalBudget),
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.actionPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              if (trip.tags.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.space2),
                Wrap(
                  spacing: AppSpacing.space2,
                  children: trip.tags
                      .map(
                        (t) => TagChip(
                          label: t,
                          variant: TagChipVariant.displayOnly,
                        ),
                      )
                      .toList(),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.icon, required this.label});
  final String icon;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(icon, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            label,
            style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    ),
  );
}

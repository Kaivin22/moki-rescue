import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/review_card.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
// ignore_for_file: unused_import
import '../providers/review_providers.dart';
import '../../domain/models/review.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-19: ReviewListScreen (embedded trong PlaceDetailScreen Tab 1)
/// Rating summary card + breakdown bars + ReviewCard list
/// ═══════════════════════════════════════════════════════

class ReviewListScreen extends ConsumerStatefulWidget {
  const ReviewListScreen({super.key, this.placeId, this.canReview = true});

  final String? placeId;
  final bool canReview;

  @override
  ConsumerState<ReviewListScreen> createState() => _ReviewListScreenState();
}

class _ReviewListScreenState extends ConsumerState<ReviewListScreen> {
  final List<String> _selectedFilters = [];
  final bool _isLoading = false;

  static const _filterChips = ['Tất cả', '5★', '4★', 'Cặp đôi', 'Gia đình'];

  static final _demoReviews = [
    (
      userName: 'Nguyễn Minh Tú',
      avatarUrl: 'https://picsum.photos/seed/av1/80/80',
      rating: 5,
      createdAt: DateTime(2025, 5, 12),
      comment:
          'Bãi biển đẹp tuyệt vời! Nước trong xanh, cát trắng mịn. Buổi sáng sớm rất yên tĩnh, phù hợp để đi dạo và tập thể dục.',
      visitType: 'couple',
      visitMonth: 5,
      highlights: ['Phong cảnh', 'Không khí'],
    ),
    (
      userName: 'Trần Lan Anh',
      avatarUrl: 'https://picsum.photos/seed/av2/80/80',
      rating: 4,
      createdAt: DateTime(2025, 4, 3),
      comment:
          'Biển đẹp nhưng khá đông vào cuối tuần. Nên đến sớm để tìm chỗ tốt.',
      visitType: 'family',
      visitMonth: 4,
      highlights: ['Ẩm thực', 'Phong cảnh'],
    ),
    (
      userName: 'Lê Bảo Long',
      avatarUrl: 'https://picsum.photos/seed/av3/80/80',
      rating: 5,
      createdAt: DateTime(2025, 3, 20),
      comment:
          'Cực kỳ thích bầu không khí nơi đây, rất thư giãn và trong lành.',
      visitType: 'group',
      visitMonth: 3,
      highlights: ['Không khí', 'Thân thiện'],
    ),
  ];

  // Breakdown: [5★, 4★, 3★, 2★, 1★] count
  static const _breakdown = [87, 38, 12, 4, 1];
  static const _avgRating = 4.7;
  static const _totalReviews = 142;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.layoutSm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Rating summary card ──
          Container(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            decoration: BoxDecoration(
              color: SagePalette.sage100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Big rating number
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _avgRating.toStringAsFixed(1),
                      style: AppTextStyles.display.copyWith(
                        color: AppColors.actionPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 48,
                      ),
                    ),
                    Row(
                      children: List.generate(
                        5,
                        (i) => Icon(
                          i < _avgRating.floor()
                              ? Icons.star_rounded
                              : (i < _avgRating
                                    ? Icons.star_half_rounded
                                    : Icons.star_outline_rounded),
                          color: AppColors.actionPrimary,
                          size: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$_totalReviews đánh giá',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),

                const SizedBox(width: AppSpacing.layoutSm),

                // Breakdown bars
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (i) {
                      final star = 5 - i;
                      final count = _breakdown[i];
                      final pct = count / _totalReviews;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            Text(
                              '$star★',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.space2),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(2),
                                child: LinearProgressIndicator(
                                  value: pct,
                                  backgroundColor: SagePalette.sage200,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    AppColors.actionPrimary,
                                  ),
                                  minHeight: 6,
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.space2),
                            SizedBox(
                              width: 24,
                              child: Text(
                                '$count',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                                textAlign: TextAlign.end,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),

          // ── Write review button ──
          if (widget.canReview) ...[
            const SizedBox(height: AppSpacing.space3),
            AppButton(
              label: '✏ Viết đánh giá',
              variant: AppButtonVariant.secondary,
              onPressed: () {
                context.push('/write-review/${widget.placeId}');
              },
            ),
          ],

          const SizedBox(height: AppSpacing.layoutSm),

          // ── Filter chips ──
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filterChips.map((f) {
                final isSelected =
                    _selectedFilters.contains(f) ||
                    (f == 'Tất cả' && _selectedFilters.isEmpty);
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space2),
                  child: TagChip(
                    label: f,
                    isSelected: isSelected,
                    variant: TagChipVariant.filter,
                    onTap: () => setState(() {
                      if (f == 'Tất cả') {
                        _selectedFilters.clear();
                      } else {
                        isSelected
                            ? _selectedFilters.remove(f)
                            : _selectedFilters.add(f);
                      }
                    }),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.space3),

          // ── Reviews list ──
          if (_isLoading)
            const LoadingShimmerList(
              variant: ShimmerVariant.listTile,
              itemCount: 3,
            )
          else if (_demoReviews.isEmpty)
            EmptyState(type: EmptyStateType.noReviews)
          else
            ...List.generate(_demoReviews.length, (i) {
              final r = _demoReviews[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.space3),
                child: ReviewCard(
                  userName: r.userName,
                  avatarUrl: r.avatarUrl,
                  rating: r.rating,
                  createdAt: r.createdAt,
                  comment: r.comment,
                  visitType: r.visitType,
                  visitMonth: r.visitMonth,
                  highlights: r.highlights.toList(),
                ),
              );
            }),
        ],
      ),
    );
  }
}

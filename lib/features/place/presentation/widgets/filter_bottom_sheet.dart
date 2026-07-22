import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';
import '../../../../shared/widgets/atoms/star_rating.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-15: FilterBottomSheet
/// DraggableScrollableSheet: category + visit type + price + duration + rating
/// ═══════════════════════════════════════════════════════

class FilterBottomSheet extends StatefulWidget {
  const FilterBottomSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const FilterBottomSheet(),
    );
  }

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  final Set<String> _selectedCategories = {};
  final Set<String> _selectedVisitTypes = {};
  final Set<String> _selectedDurations = {};
  RangeValues _priceRange = const RangeValues(0, 500000);
  int _minRating = 0;

  static const _categories = [
    ('🏖', 'Bãi biển', 'beach'),
    ('⛰', 'Núi', 'mountain'),
    ('🏛', 'Đền chùa', 'temple'),
    ('🏫', 'Bảo tàng', 'museum'),
    ('🍜', 'Ẩm thực', 'food'),
    ('🏪', 'Chợ', 'market'),
  ];

  static const _visitTypes = ['Cặp đôi', 'Gia đình', 'Nhóm bạn', 'Một mình'];
  static const _durations = ['< 1 giờ', '1-3 giờ', '3-6 giờ', '> 6 giờ'];

  void _reset() {
    setState(() {
      _selectedCategories.clear();
      _selectedVisitTypes.clear();
      _selectedDurations.clear();
      _priceRange = const RangeValues(0, 500000);
      _minRating = 0;
    });
  }

  String _formatPrice(double v) {
    if (v <= 0) return 'Miễn phí';
    if (v >= 500000) return '≥ 500k';
    return '${(v / 1000).round()}k';
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.6,
      maxChildSize: 0.95,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.sheetBorder,
        ),
        child: Column(
          children: [
            // ── Handle bar ──
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.space3),
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: SagePalette.sage300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // ── Header ──
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutMd,
              ),
              child: Row(
                children: [
                  Text(
                    'Lọc địa điểm',
                    style: AppTextStyles.h3.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _reset,
                    child: Text(
                      'Đặt lại',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.actionSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const AppDivider(),

            // ── Scrollable content ──
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.all(AppSpacing.layoutMd),
                children: [
                  // Category chips
                  _SectionLabel('Loại địa điểm'),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: _categories.map((cat) {
                      final (emoji, label, key) = cat;
                      return TagChip(
                        label: '$emoji $label',
                        isSelected: _selectedCategories.contains(key),
                        variant: TagChipVariant.filter,
                        onTap: () => setState(() {
                          _selectedCategories.contains(key)
                              ? _selectedCategories.remove(key)
                              : _selectedCategories.add(key);
                        }),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  // Visit type
                  _SectionLabel('Phù hợp với'),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: _visitTypes
                        .map(
                          (t) => TagChip(
                            label: t,
                            isSelected: _selectedVisitTypes.contains(t),
                            variant: TagChipVariant.filter,
                            onTap: () => setState(() {
                              _selectedVisitTypes.contains(t)
                                  ? _selectedVisitTypes.remove(t)
                                  : _selectedVisitTypes.add(t);
                            }),
                          ),
                        )
                        .toList(),
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  // Price range
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _SectionLabel('Giá vé'),
                      Text(
                        '${_formatPrice(_priceRange.start)} – ${_formatPrice(_priceRange.end)}',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.actionPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  RangeSlider(
                    values: _priceRange,
                    min: 0,
                    max: 500000,
                    divisions: 10,
                    activeColor: AppColors.actionPrimary,
                    inactiveColor: SagePalette.sage200,
                    onChanged: (v) => setState(() => _priceRange = v),
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  // Duration
                  _SectionLabel('Thời gian tham quan'),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: _durations
                        .map(
                          (d) => TagChip(
                            label: d,
                            isSelected: _selectedDurations.contains(d),
                            variant: TagChipVariant.filter,
                            onTap: () => setState(() {
                              _selectedDurations.contains(d)
                                  ? _selectedDurations.remove(d)
                                  : _selectedDurations.add(d);
                            }),
                          ),
                        )
                        .toList(),
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  // Min rating
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _SectionLabel('Đánh giá tối thiểu'),
                      if (_minRating > 0)
                        Text(
                          '$_minRating ★ trở lên',
                          style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.actionPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  StarRating(rating: _minRating.toDouble(), size: StarSize.lg),
                  const SizedBox(height: AppSpacing.space2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (i) {
                      final star = i + 1;
                      return GestureDetector(
                        onTap: () => setState(
                          () => _minRating = _minRating == star ? 0 : star,
                        ),
                        child: Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          child: Icon(
                            star <= _minRating
                                ? Icons.star_rounded
                                : Icons.star_outline_rounded,
                            color: AppColors.actionPrimary,
                            size: 32,
                          ),
                        ),
                      );
                    }),
                  ),

                  const SizedBox(height: AppSpacing.layoutMd),
                ],
              ),
            ),

            // ── Apply button ──
            Padding(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.layoutMd,
                0,
                AppSpacing.layoutMd,
                MediaQuery.of(context).padding.bottom + AppSpacing.layoutSm,
              ),
              child: AppButton(
                label: 'Áp dụng bộ lọc',
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppTextStyles.h4.copyWith(
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/ai_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-41: BudgetCalculatorScreen
/// Interactive trip budget estimator
/// Input: ngày, số người, kiểu lưu trú, di chuyển
/// Output: breakdown chart + tổng ước tính
/// ═══════════════════════════════════════════════════════

class BudgetCalculatorScreen extends ConsumerWidget {
  const BudgetCalculatorScreen({super.key});
  String _formatVnd(int amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}tr đ';
    }
    return '${(amount / 1000).round()}k đ';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(budgetProvider);
    final notifier = ref.read(budgetProvider.notifier);
    final estimate = state.estimate;
    final breakdown = estimate?.breakdown ?? {};
    final total = estimate?.total ?? 0;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Tính ngân sách',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Result card ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.actionPrimary, AppColors.actionSecondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadius.cardBorder,
              ),
              child: Column(
                children: [
                  Text(
                    'Ngân sách ước tính',
                    style: AppTextStyles.bodyMd.copyWith(color: Colors.white70),
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  Text(
                    _formatVnd(total),
                    style: AppTextStyles.display.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 36,
                    ),
                  ),
                  Text(
                    '${state.numDays} ngày · ${state.numPeople} người',
                    style: AppTextStyles.caption.copyWith(
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  // Mini bar chart
                  ...breakdown.entries.map((e) {
                    final pct = total > 0 ? e.value / total : 0.0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: Text(
                              e.key,
                              style: AppTextStyles.caption.copyWith(
                                color: Colors.white70,
                              ),
                            ),
                          ),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(2),
                              child: LinearProgressIndicator(
                                value: pct,
                                backgroundColor: Colors.white24,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                                minHeight: 6,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatVnd(e.value),
                            style: AppTextStyles.caption.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Inputs ──
            _SectionLabel('Số ngày'),
            _StepperRow(
              value: state.numDays,
              min: 1,
              max: 14,
              onDecrement: () => notifier.setDays(state.numDays - 1),
              onIncrement: () => notifier.setDays(state.numDays + 1),
              suffix: 'ngày',
            ),
            const SizedBox(height: AppSpacing.layoutSm),

            _SectionLabel('Số người'),
            _StepperRow(
              value: state.numPeople,
              min: 1,
              max: 20,
              onDecrement: () => notifier.setPeople(state.numPeople - 1),
              onIncrement: () => notifier.setPeople(state.numPeople + 1),
              suffix: 'người',
            ),
            const SizedBox(height: AppSpacing.layoutSm),

            _SectionLabel('Lưu trú'),
            _ChoiceRow(
              choices: const [
                (id: 'budget', label: '🏠 Hostel', sub: '~150k/đêm'),
                (id: 'mid', label: '🏨 Khách sạn 3★', sub: '~450k/đêm'),
                (id: 'luxury', label: '🏩 Resort 5★', sub: '~1.2tr/đêm'),
              ],
              selected: state.accommodation,
              onSelect: (v) => notifier.setAccommodation(v),
            ),
            const SizedBox(height: AppSpacing.layoutSm),

            _SectionLabel('Di chuyển'),
            _ChoiceRow(
              choices: const [
                (id: 'walk', label: '🚶 Đi bộ', sub: 'Miễn phí'),
                (id: 'motorbike', label: '🛵 Xe máy', sub: '~80k/ngày'),
                (id: 'car', label: '🚗 Thuê xe', sub: '~300k/ngày'),
                (id: 'taxi', label: '🚕 Taxi', sub: '~200k/ngày'),
              ],
              selected: state.transport,
              onSelect: (v) => notifier.setTransport(v),
            ),
            const SizedBox(height: AppSpacing.layoutSm),

            _SectionLabel('Phong cách ăn uống'),
            _ChoiceRow(
              choices: const [
                (id: 'street', label: '🍢 Vỉa hè', sub: '~80k/người'),
                (id: 'local', label: '🍜 Quán địa phương', sub: '~150k/người'),
                (id: 'mid', label: '🍽 Nhà hàng', sub: '~300k/người'),
                (id: 'upscale', label: '🥂 Cao cấp', sub: '~600k/người'),
              ],
              selected: state.foodStyle,
              onSelect: (v) => notifier.setFoodStyle(v),
            ),
            const SizedBox(height: AppSpacing.layoutSm),

            // Include activities toggle
            Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: AppRadius.cardBorder,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Row(
                children: [
                  const Text('🎡', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tham quan & Giải trí',
                          style: AppTextStyles.bodyMd.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '~${_formatVnd(200000)}/người/ngày',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: state.includeActivities,
                    onChanged: (v) => notifier.setIncludeActivities(v),
                    activeThumbColor: AppColors.actionPrimary,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutXl),

            AppButton(
              label: '📋 Tạo lịch trình với ngân sách này',
              onPressed: () {},
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
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.space2),
    child: Text(
      text,
      style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
    ),
  );
}

class _StepperRow extends StatelessWidget {
  const _StepperRow({
    required this.value,
    required this.min,
    required this.max,
    required this.onDecrement,
    required this.onIncrement,
    required this.suffix,
  });
  final int value;
  final int min;
  final int max;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final String suffix;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      IconButton(
        onPressed: value > min ? onDecrement : null,
        icon: const Icon(Icons.remove_circle_outline_rounded),
        color: AppColors.actionPrimary,
        disabledColor: AppColors.textPlaceholder,
      ),
      Expanded(
        child: Center(
          child: Text(
            '$value $suffix',
            style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ),
      IconButton(
        onPressed: value < max ? onIncrement : null,
        icon: const Icon(Icons.add_circle_outline_rounded),
        color: AppColors.actionPrimary,
        disabledColor: AppColors.textPlaceholder,
      ),
    ],
  );
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.choices,
    required this.selected,
    required this.onSelect,
  });
  final List<({String id, String label, String sub})> choices;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: AppSpacing.space2,
    runSpacing: AppSpacing.space2,
    children: choices.map((c) {
      final isSelected = selected == c.id;
      return GestureDetector(
        onTap: () => onSelect(c.id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space3,
            vertical: AppSpacing.space2,
          ),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.actionPrimary.withValues(alpha: 0.1)
                : AppColors.backgroundSecondary,
            borderRadius: AppRadius.cardBorder,
            border: Border.all(
              color: isSelected
                  ? AppColors.actionPrimary
                  : AppColors.borderDefault,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                c.label,
                style: AppTextStyles.bodySm.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? AppColors.actionPrimary
                      : AppColors.textPrimary,
                ),
              ),
              Text(
                c.sub,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }).toList(),
  );
}

import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-17: SortBottomSheet
/// 4 RadioListTile sort options + Apply button
/// ═══════════════════════════════════════════════════════

enum SortOption {
  popular('Phổ biến nhất'),
  topRated('Đánh giá cao'),
  newest('Mới nhất'),
  nearest('Gần nhất');

  const SortOption(this.label);
  final String label;
}

class SortBottomSheet extends StatefulWidget {
  const SortBottomSheet({
    super.key,
    this.initialOption = SortOption.popular,
  });

  final SortOption initialOption;

  static Future<SortOption?> show(
    BuildContext context, {
    SortOption initial = SortOption.popular,
  }) {
    return showModalBottomSheet<SortOption>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SortBottomSheet(initialOption: initial),
    );
  }

  @override
  State<SortBottomSheet> createState() => _SortBottomSheetState();
}

class _SortBottomSheetState extends State<SortBottomSheet> {
  late SortOption _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialOption;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: AppRadius.sheetBorder,
      ),
      padding: EdgeInsets.fromLTRB(
        0,
        AppSpacing.space3,
        0,
        MediaQuery.of(context).padding.bottom + AppSpacing.layoutSm,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: SagePalette.sage300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutMd),
            child: Text(
              'Sắp xếp theo',
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.space3),

          // Sort options — dùng ListTile + Radio thủ công (tránh RadioListTile deprecated)
          ...SortOption.values.map((opt) => InkWell(
                onTap: () => setState(() => _selected = opt),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.layoutMd,
                    vertical: AppSpacing.space1,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          opt.label,
                          style: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: _selected == opt
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _selected == opt
                                  ? AppColors.actionPrimary
                                  : AppColors.borderDefault,
                              width: 2,
                            ),
                          ),
                          child: _selected == opt
                              ? Center(
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                      color: AppColors.actionPrimary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
              )),

          const SizedBox(height: AppSpacing.space3),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutMd),
            child: AppButton(
              label: 'Áp dụng',
              onPressed: () => Navigator.pop(context, _selected),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-74: SearchNoResultsScreen
/// Center: magnify icon + query highlight + suggestion chips + back
/// ═══════════════════════════════════════════════════════

class SearchNoResultsScreen extends StatelessWidget {
  const SearchNoResultsScreen({
    super.key,
    required this.query,
    this.suggestions = const [
      'Bãi biển',
      'Ẩm thực',
      'Hội An',
      'Cầu Rồng',
    ],
    this.onSuggestionTap,
    this.onViewAll,
  });

  final String query;
  final List<String> suggestions;
  final ValueChanged<String>? onSuggestionTap;
  final VoidCallback? onViewAll;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.layoutMd),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Illustration
                Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    color: SagePalette.sage100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.search_off_rounded,
                    size: 80,
                    color: SagePalette.sage400,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                Text(
                  'Không tìm thấy',
                  style: AppTextStyles.h2.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),

                const SizedBox(height: AppSpacing.space2),

                // Query highlight
                Text(
                  '"$query"',
                  style: AppTextStyles.h3.copyWith(
                    color: AppColors.actionPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),

                const SizedBox(height: AppSpacing.space3),

                Text(
                  'Thử tìm với từ khóa khác hoặc bỏ bớt bộ lọc.',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: AppSpacing.layoutSm),

                // Suggestion chips
                Wrap(
                  spacing: AppSpacing.space2,
                  runSpacing: AppSpacing.space2,
                  alignment: WrapAlignment.center,
                  children: suggestions.map((s) {
                    return GestureDetector(
                      onTap: () => onSuggestionTap?.call(s),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.space3,
                          vertical: AppSpacing.space2,
                        ),
                        decoration: BoxDecoration(
                          color: SagePalette.sage100,
                          borderRadius: AppRadius.chipBorder,
                          border: Border.all(
                            color: SagePalette.sage300,
                            width: 1,
                          ),
                        ),
                        child: Text(
                          s,
                          style: AppTextStyles.bodySm.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                SizedBox(
                  width: 280,
                  child: AppButton(
                    label: 'Xem tất cả địa điểm',
                    variant: AppButtonVariant.secondary,
                    onPressed: onViewAll,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_spacing.dart';
import '../atoms/tag_chip.dart';
import '../atoms/category_icon.dart';

/// ═══════════════════════════════════════════════════════
/// C-23: CategoryFilterRow
/// SingleChildScrollView horizontal, no scrollbar
/// CategoryChips với emoji + label, 40px height, gap 8px
/// ═══════════════════════════════════════════════════════

/// Danh sách categories chuẩn
const List<String> kDefaultCategories = [
  'beach',
  'mountain',
  'temple',
  'museum',
  'food',
  'market',
  'entertainment',
  'nature',
  'historical',
  'viewpoint',
  'park',
];

/// Label tiếng Việt cho category
const Map<String, String> _categoryLabels = {
  'beach': 'Bãi biển',
  'mountain': 'Núi',
  'temple': 'Đền chùa',
  'museum': 'Bảo tàng',
  'food': 'Ẩm thực',
  'market': 'Chợ',
  'entertainment': 'Vui chơi',
  'nature': 'Thiên nhiên',
  'historical': 'Di tích',
  'viewpoint': 'Ngắm cảnh',
  'park': 'Công viên',
};

class CategoryFilterRow extends StatelessWidget {
  const CategoryFilterRow({
    super.key,
    required this.selectedCategories,
    required this.onCategoryToggled,
    this.categories,
    this.showAll = true,
    this.padding,
  });

  /// Các category đang được chọn
  final Set<String> selectedCategories;

  /// Callback khi toggle chọn/bỏ chọn category
  final ValueChanged<String> onCategoryToggled;

  /// Danh sách categories (mặc định tất cả)
  final List<String>? categories;

  /// Hiển thị chip "Tất cả" ở đầu
  final bool showAll;

  /// Padding tùy chỉnh
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final cats = categories ?? kDefaultCategories;
    final bool isAllSelected = selectedCategories.isEmpty;

    return SizedBox(
      height: 40,
      child: ScrollConfiguration(
        // Ẩn scrollbar
        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: padding ??
              const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
          itemCount: showAll ? cats.length + 1 : cats.length,
          separatorBuilder: (_, _) =>
              const SizedBox(width: AppSpacing.space2),
          itemBuilder: (context, index) {
            // Chip "Tất cả" đầu tiên
            if (showAll && index == 0) {
              return TagChip(
                label: 'Tất cả',
                variant: TagChipVariant.filter,
                isSelected: isAllSelected,
                onTap: () {
                  // Bỏ chọn tất cả categories → hiển thị all
                  if (!isAllSelected) {
                    for (final cat in selectedCategories.toList()) {
                      onCategoryToggled(cat);
                    }
                  }
                },
              );
            }

            final catIndex = showAll ? index - 1 : index;
            final cat = cats[catIndex];
            final emoji = CategoryIcon.getEmoji(cat);
            final label = _categoryLabels[cat] ?? cat;

            return TagChip(
              label: label,
              variant: TagChipVariant.filter,
              isSelected: selectedCategories.contains(cat),
              onTap: () => onCategoryToggled(cat),
              leading: Text(emoji, style: const TextStyle(fontSize: 14)),
            );
          },
        ),
      ),
    );
  }
}

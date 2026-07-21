import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';

/// ═══════════════════════════════════════════════════════
/// C-05: CategoryIcon
/// Emoji icon trong circle container (sage.100 bg)
/// Category → emoji mapping chuẩn
/// Sizes: sm(28) | md(36) | lg(48)
/// ═══════════════════════════════════════════════════════

/// Kích thước CategoryIcon
enum CategoryIconSize { sm, md, lg }

/// Mapping category → emoji
const Map<String, String> _categoryEmojis = {
  'beach': '🏖',
  'mountain': '🏔',
  'temple': '⛩',
  'museum': '🏛',
  'food': '🍜',
  'market': '🛒',
  'entertainment': '🎡',
  'nature': '🌿',
  'historical': '🏰',
  'viewpoint': '📍',
  'park': '🌳',
};

/// Icon hiển thị category dưới dạng emoji trong circle
class CategoryIcon extends StatelessWidget {
  const CategoryIcon({
    super.key,
    required this.category,
    this.size = CategoryIconSize.md,
  });

  /// Tên category (beach, mountain, temple, etc.)
  final String category;

  /// Kích thước icon
  final CategoryIconSize size;

  /// Kích thước pixel theo enum
  double get _sizePixels => switch (size) {
    CategoryIconSize.sm => 28,
    CategoryIconSize.md => 36,
    CategoryIconSize.lg => 48,
  };

  /// Font size emoji theo kích thước
  double get _emojiSize => switch (size) {
    CategoryIconSize.sm => 14,
    CategoryIconSize.md => 18,
    CategoryIconSize.lg => 24,
  };

  @override
  Widget build(BuildContext context) {
    final emoji = _categoryEmojis[category.toLowerCase()] ?? '📍';

    return Semantics(
      label: category,
      excludeSemantics: false,
      child: Container(
        width: _sizePixels,
        height: _sizePixels,
        decoration: const BoxDecoration(
          color: AppColors.backgroundSecondary,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          emoji,
          style: TextStyle(fontSize: _emojiSize),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  /// Lấy emoji cho category (utility method)
  static String getEmoji(String category) {
    return _categoryEmojis[category.toLowerCase()] ?? '📍';
  }
}

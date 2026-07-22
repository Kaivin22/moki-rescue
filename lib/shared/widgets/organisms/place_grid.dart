import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_spacing.dart';
import '../molecules/place_card.dart';
import '../molecules/loading_shimmer.dart';

/// ═══════════════════════════════════════════════════════
/// C-24: PlaceGrid
/// GridView 2 columns, PlaceCard, gap 12px
/// Hỗ trợ infinite scroll via callback
/// ═══════════════════════════════════════════════════════

/// Data model đơn giản cho PlaceGrid
/// (sẽ được thay bằng PlaceEntity ở domain layer)
class PlaceGridItem {
  const PlaceGridItem({
    required this.name,
    required this.imageUrl,
    required this.category,
    required this.rating,
    this.durationMin,
    this.entryFee,
    this.isSaved = false,
  });

  final String name;
  final String imageUrl;
  final String category;
  final double rating;
  final int? durationMin;
  final int? entryFee;
  final bool isSaved;
}

class PlaceGrid extends StatelessWidget {
  const PlaceGrid({
    super.key,
    required this.items,
    required this.onItemTap,
    this.onItemSave,
    this.isLoading = false,
    this.onLoadMore,
    this.padding,
  });

  /// Danh sách địa điểm
  final List<PlaceGridItem> items;

  /// Callback khi tap địa điểm (truyền index)
  final ValueChanged<int> onItemTap;

  /// Callback khi tap save (truyền index)
  final ValueChanged<int>? onItemSave;

  /// Đang tải thêm
  final bool isLoading;

  /// Callback tải thêm (infinite scroll)
  final VoidCallback? onLoadMore;

  /// Padding tùy chỉnh
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    // Loading state: hiển thị skeleton grid
    if (isLoading && items.isEmpty) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding:
            padding ??
            const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: AppSpacing.space3,
          mainAxisSpacing: AppSpacing.space3,
          childAspectRatio: 160 / 220,
        ),
        itemCount: 6,
        itemBuilder: (_, _) => const PlaceCardSkeleton(),
      );
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        // Trigger load more khi scroll gần cuối
        if (notification is ScrollEndNotification &&
            notification.metrics.pixels >=
                notification.metrics.maxScrollExtent - 200 &&
            onLoadMore != null &&
            !isLoading) {
          onLoadMore!();
        }
        return false;
      },
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding:
            padding ??
            const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: AppSpacing.space3,
          mainAxisSpacing: AppSpacing.space3,
          childAspectRatio: 160 / 220,
        ),
        itemCount: items.length + (isLoading ? 2 : 0),
        itemBuilder: (context, index) {
          // Loading indicators ở cuối
          if (index >= items.length) {
            return const PlaceCardSkeleton();
          }

          final item = items[index];
          return PlaceCard(
            name: item.name,
            imageUrl: item.imageUrl,
            category: item.category,
            rating: item.rating,
            durationMin: item.durationMin,
            entryFee: item.entryFee,
            isSaved: item.isSaved,
            onTap: () => onItemTap(index),
            onSave: onItemSave != null ? () => onItemSave!(index) : null,
          );
        },
      ),
    );
  }
}

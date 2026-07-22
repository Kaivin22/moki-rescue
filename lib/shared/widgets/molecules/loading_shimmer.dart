import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-20: LoadingShimmer
/// Base: sage.200 | Highlight: neutral.50
/// Variants: PlaceCardSkeleton | ListTileSkeleton | ItineraryCardSkeleton
/// Duration: 1200ms loop
/// ═══════════════════════════════════════════════════════

/// Shimmer wrapper chuẩn — dùng chung cho mọi skeleton
class ShimmerWrapper extends StatelessWidget {
  const ShimmerWrapper({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: SagePalette.sage200,
      highlightColor: NeutralPalette.neutral50,
      period: const Duration(milliseconds: 1200),
      child: child,
    );
  }
}

/// Hộp bo tròn dùng trong skeleton
class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({
    required this.width,
    required this.height,
    this.borderRadius,
  });

  final double width;
  final double height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: SagePalette.sage200,
        borderRadius: borderRadius ?? BorderRadius.circular(AppRadius.sm),
      ),
    );
  }
}

/// Skeleton cho PlaceCard (160×220)
class PlaceCardSkeleton extends StatelessWidget {
  const PlaceCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWrapper(
      child: Container(
        width: 160,
        height: 220,
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh placeholder
            _SkeletonBox(
              width: 160,
              height: 121,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            // Info placeholder
            Padding(
              padding: const EdgeInsets.all(AppSpacing.space3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SkeletonBox(width: 120, height: 14),
                  const SizedBox(height: AppSpacing.space2),
                  _SkeletonBox(width: 80, height: 10),
                  const SizedBox(height: AppSpacing.space2),
                  _SkeletonBox(width: 60, height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton cho PlaceListTile (full-width × 96px)
class ListTileSkeleton extends StatelessWidget {
  const ListTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWrapper(
      child: Container(
        height: 96,
        padding: const EdgeInsets.all(AppSpacing.space2),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
        ),
        child: Row(
          children: [
            // Thumbnail placeholder
            _SkeletonBox(
              width: 80,
              height: 80,
              borderRadius: AppRadius.thumbnailBorder,
            ),
            const SizedBox(width: AppSpacing.space3),
            // Text placeholders
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _SkeletonBox(width: double.infinity, height: 14),
                  const SizedBox(height: AppSpacing.space2),
                  _SkeletonBox(width: 160, height: 10),
                  const SizedBox(height: AppSpacing.space2),
                  _SkeletonBox(width: 100, height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton cho ItineraryCard (full-width × 180px)
class ItineraryCardSkeleton extends StatelessWidget {
  const ItineraryCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWrapper(
      child: Container(
        height: 180,
        width: double.infinity,
        decoration: BoxDecoration(
          color: SagePalette.sage200,
          borderRadius: AppRadius.cardBorder,
        ),
        child: Stack(
          children: [
            // Badge placeholder (top-right)
            Positioned(
              top: AppSpacing.space3,
              right: AppSpacing.space3,
              child: _SkeletonBox(
                width: 60,
                height: 24,
                borderRadius: AppRadius.chipBorder,
              ),
            ),
            // Bottom content placeholder
            Positioned(
              left: AppSpacing.space4,
              right: AppSpacing.space4,
              bottom: AppSpacing.space4,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SkeletonBox(width: 200, height: 18),
                  const SizedBox(height: AppSpacing.space2),
                  _SkeletonBox(width: 140, height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tạo danh sách skeleton theo loại
class LoadingShimmerList extends StatelessWidget {
  const LoadingShimmerList({
    super.key,
    this.itemCount = 5,
    this.variant = ShimmerVariant.listTile,
    this.scrollDirection = Axis.vertical,
  });

  /// Số item skeleton hiển thị
  final int itemCount;

  /// Loại skeleton
  final ShimmerVariant variant;

  /// Hướng scroll
  final Axis scrollDirection;

  @override
  Widget build(BuildContext context) {
    if (variant == ShimmerVariant.placeCard) {
      return SizedBox(
        height: 220,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
          itemCount: itemCount,
          separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.space3),
          itemBuilder: (_, _) => const PlaceCardSkeleton(),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      itemCount: itemCount,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, _) => switch (variant) {
        ShimmerVariant.listTile => const ListTileSkeleton(),
        ShimmerVariant.itineraryCard => const ItineraryCardSkeleton(),
        ShimmerVariant.placeCard => const PlaceCardSkeleton(),
      },
    );
  }
}

/// Loại shimmer skeleton
enum ShimmerVariant { placeCard, listTile, itineraryCard }

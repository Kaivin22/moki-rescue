import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../place/presentation/providers/place_providers.dart';
import '../../../place/domain/models/place.dart';

/// SCREEN-ADMIN-PLACES: Danh sách địa điểm với search
class AdminPlacesScreen extends ConsumerStatefulWidget {
  const AdminPlacesScreen({super.key});

  @override
  ConsumerState<AdminPlacesScreen> createState() => _AdminPlacesScreenState();
}

class _AdminPlacesScreenState extends ConsumerState<AdminPlacesScreen> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final placesAsync = _query.isEmpty
        ? ref.watch(allPlacesProvider)
        : ref.watch(searchPlacesProvider(_query));

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Địa điểm',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => context.push(AppRoutes.editorPlacesNew),
            tooltip: 'Thêm địa điểm',
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Search ──
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.layoutSm,
              AppSpacing.space2,
              AppSpacing.layoutSm,
              AppSpacing.space2,
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (v) {
                Future.delayed(const Duration(milliseconds: 400), () {
                  if (mounted && _searchController.text == v) {
                    setState(() => _query = v.trim());
                  }
                });
              },
              decoration: InputDecoration(
                hintText: 'Tìm địa điểm...',
                hintStyle: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textPlaceholder,
                ),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: AppColors.textSecondary,
                ),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space3,
                  vertical: 12,
                ),
              ),
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ),

          // ── List ──
          Expanded(
            child: placesAsync.when(
              loading: () => const LoadingShimmerList(
                variant: ShimmerVariant.listTile,
                itemCount: 8,
              ),
              error: (e, _) => EmptyState(type: EmptyStateType.noResults),
              data: (places) {
                if (places.isEmpty) {
                  return EmptyState(type: EmptyStateType.noResults);
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(allPlacesProvider);
                  },
                  color: AppColors.actionPrimary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.layoutSm),
                    itemCount: places.length,
                    separatorBuilder: (_, idx) =>
                        const SizedBox(height: AppSpacing.space2),
                    itemBuilder: (_, i) => _PlaceAdminTile(place: places[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PlaceAdminTile extends StatelessWidget {
  const _PlaceAdminTile({required this.place});
  final Place place;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('${AppRoutes.adminPlaces}/${place.id}/edit'),
    borderRadius: AppRadius.cardBorder,
    child: Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: place.thumbnailUrl != null
                ? Image.network(
                    place.thumbnailUrl!,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stk) => _PlaceholderIcon(),
                  )
                : _PlaceholderIcon(),
          ),
          const SizedBox(width: AppSpacing.space3),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  place.name,
                  style: AppTextStyles.bodyMd.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  place.address,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    _CategoryBadge(place.category),
                    const SizedBox(width: AppSpacing.space2),
                    Text(
                      '⭐ ${place.ratingAvg.toStringAsFixed(1)}',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Icon(Icons.edit_outlined, color: AppColors.textSecondary, size: 18),
        ],
      ),
    ),
  );
}

class _PlaceholderIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 56,
    height: 56,
    decoration: BoxDecoration(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(8),
    ),
    child: const Icon(Icons.place_outlined, color: AppColors.textSecondary),
  );
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge(this.category);
  final String category;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: AppColors.actionPrimary.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      category,
      style: AppTextStyles.caption.copyWith(
        color: AppColors.actionPrimary,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

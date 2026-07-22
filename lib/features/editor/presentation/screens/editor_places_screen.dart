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

/// SCREEN-EDITOR-PLACES: Duyệt + tìm kiếm địa điểm để edit
class EditorPlacesScreen extends ConsumerStatefulWidget {
  const EditorPlacesScreen({super.key});

  @override
  ConsumerState<EditorPlacesScreen> createState() => _EditorPlacesScreenState();
}

class _EditorPlacesScreenState extends ConsumerState<EditorPlacesScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  String _selectedCategory = 'all';

  static const _categories = [
    (id: 'all', label: 'Tất cả'),
    (id: 'beach', label: '🏖 Biển'),
    (id: 'food', label: '🍜 Ẩm thực'),
    (id: 'historical', label: '🏮 Văn hóa'),
    (id: 'nature', label: '🌿 Thiên nhiên'),
  ];

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
            tooltip: 'Thêm mới',
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
              0,
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (v) {
                Future.delayed(const Duration(milliseconds: 350), () {
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
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
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

          // ── Category filter ──
          SizedBox(
            height: 42,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: 4,
              ),
              itemCount: _categories.length,
              itemBuilder: (_, i) {
                final cat = _categories[i];
                final isSelected = _selectedCategory == cat.id;
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space2),
                  child: FilterChip(
                    label: Text(
                      cat.label,
                      style: AppTextStyles.caption.copyWith(
                        color: isSelected
                            ? Colors.white
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    selected: isSelected,
                    onSelected: (val) =>
                        setState(() => _selectedCategory = cat.id),
                    selectedColor: AppColors.actionPrimary,
                    backgroundColor: AppColors.backgroundSecondary,
                    checkmarkColor: Colors.white,
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(
                      borderRadius: AppRadius.inputBorder,
                    ),
                  ),
                );
              },
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
              data: (allPlaces) {
                final places = _selectedCategory == 'all'
                    ? allPlaces
                    : allPlaces
                          .where((p) => p.category == _selectedCategory)
                          .toList();

                if (places.isEmpty) {
                  return EmptyState(type: EmptyStateType.noResults);
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(allPlacesProvider),
                  color: AppColors.actionPrimary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.layoutSm),
                    itemCount: places.length,
                    separatorBuilder: (_, idx) =>
                        const SizedBox(height: AppSpacing.space2),
                    itemBuilder: (_, i) => _EditorPlaceTile(place: places[i]),
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

class _EditorPlaceTile extends StatelessWidget {
  const _EditorPlaceTile({required this.place});
  final Place place;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('${AppRoutes.editorPlaces}/${place.id}/edit'),
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
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: place.thumbnailUrl != null
                ? Image.network(
                    place.thumbnailUrl!,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stk) => _Placeholder(),
                  )
                : _Placeholder(),
          ),
          const SizedBox(width: AppSpacing.space3),
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
                _CategoryPill(place.category),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.actionPrimary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              'Sửa',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.actionPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _Placeholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 52,
    height: 52,
    decoration: BoxDecoration(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(8),
    ),
    child: const Icon(
      Icons.place_outlined,
      color: AppColors.textSecondary,
      size: 20,
    ),
  );
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill(this.cat);
  final String cat;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 3),
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: AppColors.backgroundSecondary,
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      cat,
      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
    ),
  );
}

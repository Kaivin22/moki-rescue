import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/molecules/place_list_tile.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/organisms/category_filter_row.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-14: SearchResultScreen
/// AppBar: SearchBar + result count + back
/// Sort button + CategoryFilterRow + PlaceListTile list
/// ═══════════════════════════════════════════════════════

class SearchResultScreen extends StatefulWidget {
  const SearchResultScreen({super.key, required this.initialQuery});

  final String initialQuery;

  @override
  State<SearchResultScreen> createState() => _SearchResultScreenState();
}

class _SearchResultScreenState extends State<SearchResultScreen> {
  late final TextEditingController _searchController;
  final Set<String> _selectedCategories = {};
  final bool _isLoading = false;

  static const _demoResults = [
    (
      name: 'Bãi biển Mỹ Khê',
      category: 'beach',
      rating: 4.7,
      imageUrl: 'https://picsum.photos/seed/mykhe/160/160',
      distance: 2.1,
      isSaved: false,
      address: 'Quận Sơn Trà, Đà Nẵng',
    ),
    (
      name: 'Bãi biển Nam Ô',
      category: 'beach',
      rating: 4.3,
      imageUrl: 'https://picsum.photos/seed/namO/160/160',
      distance: 12.0,
      isSaved: true,
      address: 'Liên Chiểu, Đà Nẵng',
    ),
    (
      name: 'Bãi biển Lăng Cô',
      category: 'beach',
      rating: 4.5,
      imageUrl: 'https://picsum.photos/seed/langco/160/160',
      distance: 55.0,
      isSaved: false,
      address: 'Phú Lộc, Thừa Thiên Huế',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialQuery);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showSortSheet() {
    // TODO: showModalBottomSheet → SortBottomSheet
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundPrimary,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: AppColors.textPrimary,
          ),
          onPressed: () => Navigator.maybePop(context),
        ),
        title: Row(
          children: [
            // Inline search bar
            Expanded(
              child: Container(
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Row(
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(left: AppSpacing.space3),
                      child: Icon(
                        Icons.search_rounded,
                        size: 18,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.space2),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Tìm kiếm...',
                          hintStyle: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.textPlaceholder,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                        onSubmitted: (_) => setState(() {}),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.close,
                        size: 18,
                        color: AppColors.textSecondary,
                      ),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 36,
                        minHeight: 36,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.space2),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.space2),
            child: Row(
              children: [
                const SizedBox(width: AppSpacing.layoutSm),
                Text(
                  '${_demoResults.length} kết quả',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: _showSortSheet,
                  icon: const Icon(Icons.sort_rounded, size: 16),
                  label: const Text('Sắp xếp'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.actionSecondary,
                    textStyle: AppTextStyles.caption.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.layoutSm),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Category filter row
          CategoryFilterRow(
            selectedCategories: _selectedCategories,
            onCategoryToggled: (cat) => setState(() {
              _selectedCategories.contains(cat)
                  ? _selectedCategories.remove(cat)
                  : _selectedCategories.add(cat);
            }),
          ),

          const SizedBox(height: AppSpacing.space3),

          // Results list
          Expanded(
            child: _isLoading
                ? const LoadingShimmerList(
                    variant: ShimmerVariant.listTile,
                    itemCount: 5,
                  )
                : _demoResults.isEmpty
                ? EmptyState(
                    type: EmptyStateType.noResults,
                    queryText: _searchController.text,
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.layoutSm,
                    ),
                    itemCount: _demoResults.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.space3),
                    itemBuilder: (_, i) {
                      final p = _demoResults[i];
                      return PlaceListTile(
                        name: p.name,
                        address: p.address,
                        category: p.category,
                        rating: p.rating,
                        imageUrl: p.imageUrl,
                        distance: p.distance,
                        isSaved: p.isSaved,
                        onTap: () {},
                        onSave: () {},
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

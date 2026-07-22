import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../shared/widgets/molecules/place_list_tile.dart';
import '../../../../shared/widgets/molecules/section_header.dart';
import '../../../../shared/widgets/organisms/category_filter_row.dart';
import '../../../../shared/widgets/organisms/search_bar_widget.dart';
import '../widgets/filter_bottom_sheet.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-13: DiscoverScreen
/// SearchBar luôn focus + CategoryFilterRow
/// Empty query: gợi ý sections | Has query: filtered list
/// ═══════════════════════════════════════════════════════

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _searchController = TextEditingController();
  final Set<String> _selectedCategories = {};
  final bool _isLoading = false;

  static const _demoPlaces = [
    (
      name: 'Bãi biển Mỹ Khê',
      category: 'beach',
      rating: 4.7,
      imageUrl: 'https://picsum.photos/seed/mykhe/160/160',
      distance: 2.1,
      address: 'Quận Sơn Trà, Đà Nẵng',
    ),
    (
      name: 'Ngũ Hành Sơn',
      category: 'mountain',
      rating: 4.5,
      imageUrl: 'https://picsum.photos/seed/ngu/160/160',
      distance: 8.5,
      address: 'Quận Ngũ Hành Sơn, Đà Nẵng',
    ),
    (
      name: 'Phố cổ Hội An',
      category: 'historical',
      rating: 4.9,
      imageUrl: 'https://picsum.photos/seed/hoian/160/160',
      distance: 28.0,
      address: 'Hội An, Quảng Nam',
    ),
    (
      name: 'Bà Nà Hills',
      category: 'entertainment',
      rating: 4.6,
      imageUrl: 'https://picsum.photos/seed/bana/160/160',
      distance: 45.0,
      address: 'Hòa Ninh, Đà Nẵng',
    ),
    (
      name: 'Cầu Vàng',
      category: 'viewpoint',
      rating: 4.8,
      imageUrl: 'https://picsum.photos/seed/golden/160/160',
      distance: 46.0,
      address: 'Bà Nà Hills, Đà Nẵng',
    ),
  ];

  String get _query => _searchController.text.trim();

  List<_PlaceItem> get _filteredPlaces {
    final q = _query.toLowerCase();
    return _demoPlaces
        .where((p) {
          final matchQ = q.isEmpty || p.name.toLowerCase().contains(q);
          final matchCat =
              _selectedCategories.isEmpty ||
              _selectedCategories.contains(p.category);
          return matchQ && matchCat;
        })
        .map((p) => p)
        .toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPlaces;
    final hasQuery = _query.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: SafeArea(
        child: Column(
          children: [
            // ── Persistent SearchBar ──
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm,
                AppSpacing.space3,
                AppSpacing.layoutSm,
                AppSpacing.space2,
              ),
              child: SearchBarWidget(
                hint: 'Tìm địa điểm, ẩm thực...',
                controller: _searchController,
                autofocus: false,
                onChanged: (_) => setState(() {}),
                onFilterTap: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => const FilterBottomSheet(),
                  );
                },
              ),
            ),

            // ── Category filter row ──
            CategoryFilterRow(
              selectedCategories: _selectedCategories,
              onCategoryToggled: (cat) => setState(() {
                _selectedCategories.contains(cat)
                    ? _selectedCategories.remove(cat)
                    : _selectedCategories.add(cat);
              }),
            ),

            const SizedBox(height: AppSpacing.space3),

            // ── Body ──
            Expanded(
              child: _isLoading
                  ? const LoadingShimmerList(
                      variant: ShimmerVariant.listTile,
                      itemCount: 5,
                    )
                  : hasQuery
                  ? _SearchResultList(places: filtered, query: _query)
                  : _SuggestionsView(places: _demoPlaces),
            ),
          ],
        ),
      ),
    );
  }
}

typedef _PlaceItem = ({
  String name,
  String category,
  double rating,
  String imageUrl,
  double distance,
  String address,
});

/// Khi có query: danh sách kết quả
class _SearchResultList extends StatelessWidget {
  const _SearchResultList({required this.places, required this.query});

  final List<_PlaceItem> places;
  final String query;

  @override
  Widget build(BuildContext context) {
    if (places.isEmpty) {
      return EmptyState(
        type: EmptyStateType.noResults,
        queryText: query,
        actionLabel: 'Xem tất cả',
        onAction: () {},
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      itemCount: places.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space3),
      itemBuilder: (_, i) {
        final p = places[i];
        return PlaceListTile(
          name: p.name,
          address: p.address,
          category: p.category,
          rating: p.rating,
          imageUrl: p.imageUrl,
          distance: p.distance,
          onTap: () => context.push('/place/${p.name}'),
          onSave: () {},
        );
      },
    );
  }
}

/// Khi không có query: sections gợi ý + phổ biến + mới thêm
class _SuggestionsView extends StatelessWidget {
  const _SuggestionsView({required this.places});

  final List<_PlaceItem> places;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Gợi ý cho bạn', onViewAll: () {}),
          const SizedBox(height: AppSpacing.space3),

          // Top 3 places
          ...places
              .take(3)
              .map(
                (p) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.space3),
                  child: PlaceListTile(
                    name: p.name,
                    address: p.address,
                    category: p.category,
                    rating: p.rating,
                    imageUrl: p.imageUrl,
                    distance: p.distance,
                    onTap: () {},
                    onSave: () {},
                  ),
                ),
              ),

          SectionHeader(title: 'Phổ biến nhất', onViewAll: () {}),
          const SizedBox(height: AppSpacing.space3),

          // Remaining places
          ...places
              .skip(3)
              .map(
                (p) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.space3),
                  child: PlaceListTile(
                    name: p.name,
                    address: p.address,
                    category: p.category,
                    rating: p.rating,
                    imageUrl: p.imageUrl,
                    distance: p.distance,
                    onTap: () {},
                    onSave: () {},
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

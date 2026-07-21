import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/molecules/place_list_tile.dart';

import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/organisms/category_filter_row.dart';
import '../../../../shared/widgets/organisms/search_bar_widget.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-25: AddPlacesScreen — Step 2 of 3
/// Search + CategoryFilter + PlaceListTile với checkbox
/// Selected list hiển thị ở bottom sheet
/// ═══════════════════════════════════════════════════════

class AddPlacesScreen extends StatefulWidget {
  const AddPlacesScreen({
    super.key,
    required this.numDays,
    this.initialSelectedIds = const [],
  });

  final int numDays;
  final List<String> initialSelectedIds;

  @override
  State<AddPlacesScreen> createState() => _AddPlacesScreenState();
}

class _AddPlacesScreenState extends State<AddPlacesScreen> {
  final _searchController = TextEditingController();
  final Set<String> _selectedCategories = {};
  final Set<String> _selectedIds = {};

  static const _demoPlaces = [
    (id: 'p1', name: 'Bãi biển Mỹ Khê', address: 'Sơn Trà, Đà Nẵng', category: 'beach', rating: 4.7, imageUrl: 'https://picsum.photos/seed/mykhe/160/160', distance: 2.1, isSaved: false),
    (id: 'p2', name: 'Ngũ Hành Sơn', address: 'Ngũ Hành Sơn, Đà Nẵng', category: 'mountain', rating: 4.5, imageUrl: 'https://picsum.photos/seed/ngu/160/160', distance: 8.5, isSaved: false),
    (id: 'p3', name: 'Phố cổ Hội An', address: 'Hội An, Quảng Nam', category: 'historical', rating: 4.9, imageUrl: 'https://picsum.photos/seed/hoian/160/160', distance: 28.0, isSaved: true),
    (id: 'p4', name: 'Bà Nà Hills', address: 'Hòa Ninh, Đà Nẵng', category: 'entertainment', rating: 4.6, imageUrl: 'https://picsum.photos/seed/bana/160/160', distance: 45.0, isSaved: false),
    (id: 'p5', name: 'Cầu Vàng', address: 'Bà Nà Hills, Đà Nẵng', category: 'viewpoint', rating: 4.8, imageUrl: 'https://picsum.photos/seed/golden/160/160', distance: 46.0, isSaved: false),
    (id: 'p6', name: 'Bán đảo Sơn Trà', address: 'Sơn Trà, Đà Nẵng', category: 'nature', rating: 4.6, imageUrl: 'https://picsum.photos/seed/sontra/160/160', distance: 9.0, isSaved: false),
  ];

  @override
  void initState() {
    super.initState();
    _selectedIds.addAll(widget.initialSelectedIds);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<dynamic> get _filtered {
    final q = _searchController.text.toLowerCase();
    return _demoPlaces.where((p) {
      final matchQ = q.isEmpty || p.name.toLowerCase().contains(q);
      final matchCat = _selectedCategories.isEmpty || _selectedCategories.contains(p.category);
      return matchQ && matchCat;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Thêm địa điểm', style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
            Text('Bước 2 / 3 · ${widget.numDays} ngày', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
          ],
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // ── Search ──
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.layoutSm, AppSpacing.space2, AppSpacing.layoutSm, AppSpacing.space2),
            child: SearchBarWidget(
              hint: 'Tìm địa điểm...',
              controller: _searchController,
              onChanged: (_) => setState(() {}),
            ),
          ),

          // ── Category filter ──
          CategoryFilterRow(
            selectedCategories: _selectedCategories,
            onCategoryToggled: (cat) => setState(() {
              _selectedCategories.contains(cat)
                  ? _selectedCategories.remove(cat)
                  : _selectedCategories.add(cat);
            }),
          ),

          const SizedBox(height: AppSpacing.space2),

          // ── Place list with checkboxes ──
          Expanded(
            child: filtered.isEmpty
                ? EmptyState(type: EmptyStateType.noResults, queryText: _searchController.text)
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space2),
                    itemBuilder: (_, i) {
                      final p = filtered[i];
                      final isSelected = _selectedIds.contains(p.id);
                      return GestureDetector(
                        onTap: () => setState(() {
                          isSelected ? _selectedIds.remove(p.id) : _selectedIds.add(p.id);
                        }),
                        child: Stack(
                          children: [
                            PlaceListTile(
                              name: p.name,
                              address: p.address,
                              category: p.category,
                              rating: p.rating,
                              imageUrl: p.imageUrl,
                              distance: p.distance,
                              onTap: () => setState(() {
                                isSelected ? _selectedIds.remove(p.id) : _selectedIds.add(p.id);
                              }),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.actionPrimary : Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected ? AppColors.actionPrimary : AppColors.borderDefault,
                                    width: 2,
                                  ),
                                ),
                                child: isSelected
                                    ? const Icon(Icons.check, color: Colors.white, size: 14)
                                    : null,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.layoutMd, 0, AppSpacing.layoutMd, AppSpacing.layoutSm),
          child: Row(
            children: [
              if (_selectedIds.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.space3),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.actionPrimary,
                    child: Text(
                      '${_selectedIds.length}',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textOnPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              Expanded(
                child: AppButton(
                  label: _selectedIds.isEmpty
                      ? 'Chọn địa điểm để thêm'
                      : 'Tiếp tục với ${_selectedIds.length} địa điểm',
                  onPressed: _selectedIds.isNotEmpty ? () {} : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/place_card.dart';
import '../../../../shared/widgets/molecules/place_list_tile.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../providers/profile_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-35: SavedPlacesScreen
/// Grid/List toggle + folder tabs + search filter
/// ═══════════════════════════════════════════════════════

class SavedPlacesScreen extends ConsumerStatefulWidget {
  const SavedPlacesScreen({super.key});

  @override
  ConsumerState<SavedPlacesScreen> createState() => _SavedPlacesScreenState();
}

class _SavedPlacesScreenState extends ConsumerState<SavedPlacesScreen>
    with SingleTickerProviderStateMixin {
  bool _isGrid = true;
  String _selectedFolder = 'all';
  final _searchController = TextEditingController();

  static const _folders = [
    (id: 'all', label: '📂 Tất cả'),
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
    final savedAsync = ref.watch(savedPlacesProvider);

    return savedAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(
          title: Text(
            'Đã lưu',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
          ),
          backgroundColor: AppColors.backgroundPrimary,
          surfaceTintColor: Colors.transparent,
        ),
        body: const LoadingShimmerList(
          variant: ShimmerVariant.placeCard,
          itemCount: 4,
        ),
      ),
      error: (e, _) =>
          Scaffold(body: EmptyState(type: EmptyStateType.noResults)),
      data: (allPlaces) {
        final places = allPlaces.where((p) {
          final q = _searchController.text.toLowerCase();
          final matchFolder =
              _selectedFolder == 'all' || p.category == _selectedFolder;
          final matchQ = q.isEmpty || p.name.toLowerCase().contains(q);
          return matchFolder && matchQ;
        }).toList();

        return Scaffold(
          backgroundColor: AppColors.backgroundPrimary,
          appBar: AppBar(
            title: Text(
              'Đã lưu',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
            ),
            backgroundColor: AppColors.backgroundPrimary,
            surfaceTintColor: Colors.transparent,
            actions: [
              IconButton(
                icon: Icon(
                  _isGrid ? Icons.list_rounded : Icons.grid_view_rounded,
                ),
                onPressed: () => setState(() => _isGrid = !_isGrid),
                tooltip: _isGrid ? 'Danh sách' : 'Lưới',
              ),
              IconButton(
                icon: const Icon(Icons.create_new_folder_outlined),
                onPressed: () => _showNewFolderDialog(context),
                tooltip: 'Tạo thư mục',
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
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Tìm trong danh sách đã lưu...',
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

              // ── Folder tabs ──
              SizedBox(
                height: 44,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.layoutSm,
                    vertical: 4,
                  ),
                  itemCount: _folders.length,
                  itemBuilder: (_, i) {
                    final folder = _folders[i];
                    final isSelected = _selectedFolder == folder.id;
                    return Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.space2),
                      child: TagChip(
                        label: folder.label,
                        isSelected: isSelected,
                        variant: TagChipVariant.filter,
                        onTap: () =>
                            setState(() => _selectedFolder = folder.id),
                      ),
                    );
                  },
                ),
              ),

              // ── Count row ──
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.layoutSm,
                  vertical: AppSpacing.space2,
                ),
                child: Row(
                  children: [
                    Text(
                      '${places.length} địa điểm',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'Sắp xếp: Gần nhất',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.actionPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              // ── Content ──
              Expanded(
                child: places.isEmpty
                    ? EmptyState(type: EmptyStateType.noSaved)
                    : _isGrid
                    ? GridView.builder(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.layoutSm,
                        ),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: AppSpacing.space3,
                              mainAxisSpacing: AppSpacing.space3,
                              childAspectRatio: 0.75,
                            ),
                        itemCount: places.length,
                        itemBuilder: (_, i) {
                          final p = places[i];
                          return PlaceCard(
                            name: p.name,
                            imageUrl: p.thumbnailUrl ?? '',
                            category: p.category,
                            rating: p.ratingAvg,
                            isSaved: true,
                            onTap: () => context.push(
                              AppRoutes.placeDetail.replaceAll(':id', p.id),
                            ),
                            onSave: () {},
                          );
                        },
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.layoutSm,
                        ),
                        itemCount: places.length,
                        separatorBuilder: (_, idx) =>
                            const SizedBox(height: AppSpacing.space2),
                        itemBuilder: (_, i) {
                          final p = places[i];
                          return PlaceListTile(
                            name: p.name,
                            address: p.address,
                            category: p.category,
                            rating: p.ratingAvg,
                            imageUrl: p.thumbnailUrl ?? '',
                            distance: 0.0,
                            isSaved: true,
                            onTap: () => context.push(
                              AppRoutes.placeDetail.replaceAll(':id', p.id),
                            ),
                            onSave: () {},
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showNewFolderDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          'Tạo thư mục mới',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Tên thư mục...'),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Tạo',
              style: TextStyle(
                color: AppColors.actionPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

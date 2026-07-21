import 'package:flutter/material.dart';
import 'package:apple_maps_flutter/apple_maps_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/molecules/place_card.dart';
import '../../../../features/place/presentation/providers/place_providers.dart';
import '../../../../features/place/domain/models/place.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-30: MapScreen
/// Apple Maps (MapKit) integration + search overlay + bottom sheet
/// ═══════════════════════════════════════════════════════

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key, this.initialPlaceId});
  final String? initialPlaceId;

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _searchController = TextEditingController();
  final bool _showBottomSheet = true;
  String _selectedCategory = 'all';
  int? _selectedMarkerIndex;
  AppleMapController? _mapController;
  Set<Annotation> _annotations = {};

  static const _categories = [
    (id: 'all', label: 'Tất cả'),
    (id: 'beach', label: 'Bãi biển'),
    (id: 'mountain', label: 'Núi'),
    (id: 'historical', label: 'Di sản'),
    (id: 'food', label: 'Ẩm thực'),
  ];

  List<Place> get _filteredPlaces {
    final all = ref.read(filteredPlacesProvider).valueOrNull ?? [];
    if (_selectedCategory == 'all') return all;
    return all
        .where((p) => p.category == _selectedCategory)
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _updateAnnotations();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _updateAnnotations([List<Place>? places]) {
    final toRender = places ?? _filteredPlaces;
    setState(() {
      _annotations = toRender.asMap().entries.map((entry) {
        final idx = entry.key;
        final place = entry.value;
        final isSelected = _selectedMarkerIndex == idx;
        return Annotation(
          annotationId: AnnotationId(place.id),
          position: LatLng(place.lat, place.lng),
          infoWindow: InfoWindow(
            title: place.name,
            snippet: '${place.ratingAvg.toStringAsFixed(1)} ⭐',
          ),
          icon: isSelected
              ? BitmapDescriptor.defaultAnnotationWithHue(
                  BitmapDescriptor.hueOrange)
              : BitmapDescriptor.defaultAnnotation,
          onTap: () {
            setState(() => _selectedMarkerIndex = idx);
            _animateToPlace(place);
          },
        );
      }).toSet();
    });
  }

  void _animateToPlace(Place place) {
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(LatLng(place.lat, place.lng), 14.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    final placesAsync = ref.watch(filteredPlacesProvider);
    final places = placesAsync.valueOrNull ?? [];
    final filtered = _selectedCategory == 'all'
        ? places
        : places.where((p) => p.category == _selectedCategory).toList();

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Apple Map Widget ──
          Positioned.fill(
            child: AppleMap(
              initialCameraPosition: const CameraPosition(
                target: LatLng(16.047, 108.206),
                zoom: 11.0,
              ),
              annotations: _annotations,
              onMapCreated: (controller) {
                _mapController = controller;
                _updateAnnotations(filtered);
              },
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
            ),
          ),

          // ── Top search bar ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              child: Row(
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      color: AppColors.backgroundCard,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black26, blurRadius: 8)
                      ],
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_rounded, size: 20),
                      onPressed: () => Navigator.maybePop(context),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space2),
                  Expanded(
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.backgroundCard,
                        borderRadius: AppRadius.inputBorder,
                        boxShadow: const [
                          BoxShadow(color: Colors.black26, blurRadius: 8)
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Tìm trên bản đồ...',
                          hintStyle: AppTextStyles.bodyMd
                              .copyWith(color: AppColors.textPlaceholder),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.space3, vertical: 12),
                          prefixIcon: const Icon(Icons.search_rounded,
                              size: 18,
                              color: AppColors.textSecondary),
                        ),
                        style: AppTextStyles.bodyMd
                            .copyWith(color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Category chips ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(
                  top: 72, left: AppSpacing.layoutSm),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _categories.map((c) {
                    final isSelected = _selectedCategory == c.id;
                    return Padding(
                      padding:
                          const EdgeInsets.only(right: AppSpacing.space2),
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedCategory = c.id;
                            _selectedMarkerIndex = null;
                          });
                          _updateAnnotations(filtered);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.actionPrimary
                                : AppColors.backgroundCard,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(
                                  color: Colors.black26, blurRadius: 4)
                            ],
                          ),
                          child: Text(
                            c.label,
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected
                                  ? AppColors.textOnPrimary
                                  : AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),

          // ── FABs ──
          Positioned(
            right: AppSpacing.layoutSm,
            bottom: _showBottomSheet ? 290 : AppSpacing.layoutMd,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _MapFab(
                  icon: Icons.my_location_rounded,
                  onTap: () => _mapController?.animateCamera(
                      CameraUpdate.newLatLngZoom(
                          const LatLng(16.047, 108.206), 11.0)),
                ),
                const SizedBox(height: AppSpacing.space2),
                _MapFab(
                  icon: Icons.add_rounded,
                  onTap: () =>
                      _mapController?.animateCamera(CameraUpdate.zoomIn()),
                ),
                const SizedBox(height: AppSpacing.space2),
                _MapFab(
                  icon: Icons.remove_rounded,
                  onTap: () =>
                      _mapController?.animateCamera(CameraUpdate.zoomOut()),
                ),
              ],
            ),
          ),

          // ── Bottom sheet: places list ──
          if (_showBottomSheet)
            DraggableScrollableSheet(
              initialChildSize: 0.3,
              minChildSize: 0.1,
              maxChildSize: 0.6,
              builder: (_, scrollController) => Container(
                decoration: const BoxDecoration(
                  color: AppColors.backgroundCard,
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      margin:
                          const EdgeInsets.only(top: 12, bottom: 8),
                      decoration: BoxDecoration(
                        color: SagePalette.sage300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.layoutSm),
                      child: Row(
                        children: [
                          Text('${filtered.length} địa điểm',
                              style: AppTextStyles.h4
                                  .copyWith(fontWeight: FontWeight.w700)),
                          const Spacer(),
                          Text('Xem danh sách',
                              style: AppTextStyles.caption.copyWith(
                                  color: AppColors.actionSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.space2),
                    Expanded(
                      child: ListView.builder(
                        controller: scrollController,
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.layoutSm),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final place = filtered[i];
                          return Padding(
                            padding: const EdgeInsets.only(
                                right: AppSpacing.space3),
                            child: PlaceCard(
                              name: place.name,
                              imageUrl: place.imageUrls.firstOrNull ?? '',
                              category: place.category,
                              rating:
                                  place.ratingAvg,
                              onTap: () {
                                setState(() =>
                                    _selectedMarkerIndex = i);
                                _updateAnnotations(filtered);
                                _animateToPlace(place);
                                context.push(
                                  AppRoutes.placeDetail
                                      .replaceAll(':id', place.id),
                                );
                              },
                              onSave: () {},
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// _MapMarker class removed — now using Place domain model directly

class _MapFab extends StatelessWidget {
  const _MapFab({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: const BoxDecoration(
            color: AppColors.backgroundCard,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 8)],
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
      );
}


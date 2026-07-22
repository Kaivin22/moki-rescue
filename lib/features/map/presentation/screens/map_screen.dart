import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:apple_maps_flutter/apple_maps_flutter.dart'
    as apple;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
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
/// Platform adaptive: iOS → AppleMap, Android → FlutterMap (OSM)
/// ═══════════════════════════════════════════════════════

// Tọa độ trung tâm Đà Nẵng
const _kDanangLat = 16.047;
const _kDanangLng = 108.206;
const _kInitialZoom = 11.0;

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key, this.initialPlaceId});
  final String? initialPlaceId;

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _searchController = TextEditingController();
  String _selectedCategory = 'all';
  int? _selectedMarkerIndex;

  // Controller cho từng platform
  apple.AppleMapController? _appleController;
  final MapController _flutterMapController = MapController();

  static const _categories = [
    (id: 'all', label: 'Tất cả'),
    (id: 'beach', label: 'Bãi biển'),
    (id: 'mountain', label: 'Núi'),
    (id: 'historical', label: 'Di sản'),
    (id: 'food', label: 'Ẩm thực'),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    _flutterMapController.dispose();
    super.dispose();
  }

  List<Place> _filtered(List<Place> all) {
    if (_selectedCategory == 'all') return all;
    return all.where((p) => p.category == _selectedCategory).toList();
  }

  /// Di chuyển camera đến địa điểm (adaptive theo platform)
  void _animateToPlace(Place place) {
    if (Platform.isIOS) {
      _appleController?.animateCamera(
        apple.CameraUpdate.newLatLngZoom(
          apple.LatLng(place.lat, place.lng),
          14.0,
        ),
      );
    } else {
      _flutterMapController.move(
        ll.LatLng(place.lat, place.lng),
        14.0,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final placesAsync = ref.watch(filteredPlacesProvider);
    final places = placesAsync.valueOrNull ?? [];
    final filtered = _filtered(places);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Bản đồ adaptive ──
          Positioned.fill(
            child: Platform.isIOS
                ? _AppleMapView(
                    places: filtered,
                    selectedIndex: _selectedMarkerIndex,
                    onControllerCreated: (c) => _appleController = c,
                    onMarkerTap: (idx) {
                      setState(() => _selectedMarkerIndex = idx);
                      _animateToPlace(filtered[idx]);
                    },
                  )
                : _FlutterMapView(
                    places: filtered,
                    selectedIndex: _selectedMarkerIndex,
                    controller: _flutterMapController,
                    onMarkerTap: (idx) {
                      setState(() => _selectedMarkerIndex = idx);
                      _animateToPlace(filtered[idx]);
                    },
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
            bottom: 290,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _MapFab(
                  icon: Icons.my_location_rounded,
                  onTap: () {
                    if (Platform.isIOS) {
                      _appleController?.animateCamera(
                        apple.CameraUpdate.newLatLngZoom(
                          const apple.LatLng(_kDanangLat, _kDanangLng),
                          _kInitialZoom,
                        ),
                      );
                    } else {
                      _flutterMapController.move(
                        const ll.LatLng(_kDanangLat, _kDanangLng),
                        _kInitialZoom,
                      );
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.space2),
                _MapFab(
                  icon: Icons.add_rounded,
                  onTap: () {
                    if (Platform.isIOS) {
                      _appleController?.animateCamera(
                          apple.CameraUpdate.zoomIn());
                    } else {
                      _flutterMapController.move(
                        _flutterMapController.camera.center,
                        _flutterMapController.camera.zoom + 1,
                      );
                    }
                  },
                ),
                const SizedBox(height: AppSpacing.space2),
                _MapFab(
                  icon: Icons.remove_rounded,
                  onTap: () {
                    if (Platform.isIOS) {
                      _appleController?.animateCamera(
                          apple.CameraUpdate.zoomOut());
                    } else {
                      _flutterMapController.move(
                        _flutterMapController.camera.center,
                        _flutterMapController.camera.zoom - 1,
                      );
                    }
                  },
                ),
              ],
            ),
          ),

          // ── Bottom sheet ──
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
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
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
                            rating: place.ratingAvg,
                            onTap: () {
                              setState(() => _selectedMarkerIndex = i);
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

/// ═══════════════════════════════════════════════════════
/// _AppleMapView — chỉ dùng trên iOS (MapKit)
/// ═══════════════════════════════════════════════════════
class _AppleMapView extends StatefulWidget {
  const _AppleMapView({
    required this.places,
    required this.selectedIndex,
    required this.onControllerCreated,
    required this.onMarkerTap,
  });

  final List<Place> places;
  final int? selectedIndex;
  final void Function(apple.AppleMapController) onControllerCreated;
  final void Function(int index) onMarkerTap;

  @override
  State<_AppleMapView> createState() => _AppleMapViewState();
}

class _AppleMapViewState extends State<_AppleMapView> {
  Set<apple.Annotation> get _annotations {
    return widget.places.asMap().entries.map((entry) {
      final idx = entry.key;
      final place = entry.value;
      final isSelected = widget.selectedIndex == idx;
      return apple.Annotation(
        annotationId: apple.AnnotationId(place.id),
        position: apple.LatLng(place.lat, place.lng),
        infoWindow: apple.InfoWindow(
          title: place.name,
          snippet: '${place.ratingAvg.toStringAsFixed(1)} ⭐',
        ),
        icon: isSelected
            ? apple.BitmapDescriptor.defaultAnnotationWithHue(
                apple.BitmapDescriptor.hueOrange)
            : apple.BitmapDescriptor.defaultAnnotation,
        onTap: () => widget.onMarkerTap(idx),
      );
    }).toSet();
  }

  @override
  Widget build(BuildContext context) => apple.AppleMap(
        initialCameraPosition: const apple.CameraPosition(
          target: apple.LatLng(_kDanangLat, _kDanangLng),
          zoom: _kInitialZoom,
        ),
        annotations: _annotations,
        onMapCreated: widget.onControllerCreated,
        myLocationEnabled: true,
        myLocationButtonEnabled: false,
      );
}

/// ═══════════════════════════════════════════════════════
/// _FlutterMapView — dùng trên Android (OpenStreetMap tile)
/// ═══════════════════════════════════════════════════════
class _FlutterMapView extends StatelessWidget {
  const _FlutterMapView({
    required this.places,
    required this.selectedIndex,
    required this.controller,
    required this.onMarkerTap,
  });

  final List<Place> places;
  final int? selectedIndex;
  final MapController controller;
  final void Function(int index) onMarkerTap;

  @override
  Widget build(BuildContext context) => FlutterMap(
        mapController: controller,
        options: const MapOptions(
          initialCenter: ll.LatLng(_kDanangLat, _kDanangLng),
          initialZoom: _kInitialZoom,
          minZoom: 5,
          maxZoom: 18,
        ),
        children: [
          // ── OSM Tile Layer ──
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.danang.itinerary',
            // Giới hạn zoom để tránh lỗi tile không tồn tại
            maxZoom: 19,
          ),

          // ── Markers ──
          MarkerLayer(
            markers: places.asMap().entries.map((entry) {
              final idx = entry.key;
              final place = entry.value;
              final isSelected = selectedIndex == idx;

              return Marker(
                point: ll.LatLng(place.lat, place.lng),
                width: isSelected ? 44 : 36,
                height: isSelected ? 44 : 36,
                child: GestureDetector(
                  onTap: () => onMarkerTap(idx),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.actionPrimary
                          : AppColors.backgroundCard,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected
                            ? AppColors.actionPrimary
                            : AppColors.borderDefault,
                        width: 2,
                      ),
                      boxShadow: const [
                        BoxShadow(color: Colors.black26, blurRadius: 6)
                      ],
                    ),
                    child: Icon(
                      Icons.place_rounded,
                      size: isSelected ? 24 : 18,
                      color: isSelected
                          ? Colors.white
                          : AppColors.actionPrimary,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          // ── Attribution (bắt buộc theo OSM license) ──
          const RichAttributionWidget(
            attributions: [
              TextSourceAttribution('OpenStreetMap contributors'),
            ],
          ),
        ],
      );
}

/// ═══════════════════════════════════════════════════════
/// _MapFab — nút hành động nổi trên bản đồ
/// ═══════════════════════════════════════════════════════
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

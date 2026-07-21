import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-23: PlacePhotosScreen
/// SliverGrid 2-col masonry-like + hero tap-to-fullscreen
/// ═══════════════════════════════════════════════════════

class PlacePhotosScreen extends StatefulWidget {
  const PlacePhotosScreen({
    super.key,
    required this.placeName,
    this.placeId,
    this.initialIndex = 0,
  });

  final String placeName;
  final String? placeId;
  final int initialIndex;

  @override
  State<PlacePhotosScreen> createState() => _PlacePhotosScreenState();
}

class _PlacePhotosScreenState extends State<PlacePhotosScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  int? _fullscreenIndex;

  static const _tabs = ['Tất cả', 'Của bạn', 'Cộng đồng'];

  // Demo photo grid
  static final _photos = List.generate(
    18,
    (i) => _PhotoItem(
      id: 'photo_$i',
      url: 'https://picsum.photos/seed/photo${i + 1}/400/300',
      authorName: i % 3 == 0 ? 'Minh Tú' : 'Người dùng ${i + 1}',
      isOwn: i % 5 == 0,
    ),
  );

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _openFullscreen(int index) {
    setState(() => _fullscreenIndex = index);
  }

  void _closeFullscreen() {
    setState(() => _fullscreenIndex = null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Main photo grid ──
          NestedScrollView(
            headerSliverBuilder: (_, _) => [
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Ảnh',
                      style: AppTextStyles.h4.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      widget.placeName,
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
                actions: [
                  // Upload button
                  IconButton(
                    icon: const Icon(Icons.add_photo_alternate_outlined,
                        color: Colors.white),
                    onPressed: () {
                      // TODO: pick photo from gallery
                    },
                    tooltip: 'Thêm ảnh',
                  ),
                ],
                bottom: TabBar(
                  controller: _tabController,
                  labelColor: AppColors.actionPrimary,
                  unselectedLabelColor: Colors.white60,
                  indicatorColor: AppColors.actionPrimary,
                  indicatorWeight: 2,
                  tabs: _tabs.map((t) => Tab(text: t)).toList(),
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabController,
              children: [
                _PhotoGrid(
                  photos: _photos,
                  onTap: _openFullscreen,
                ),
                _PhotoGrid(
                  photos: _photos.where((p) => p.isOwn).toList(),
                  onTap: _openFullscreen,
                  emptyMessage: 'Bạn chưa đăng ảnh nào',
                ),
                _PhotoGrid(
                  photos: _photos.where((p) => !p.isOwn).toList(),
                  onTap: _openFullscreen,
                ),
              ],
            ),
          ),

          // ── Fullscreen overlay ──
          if (_fullscreenIndex != null)
            _FullscreenViewer(
              photos: _photos,
              initialIndex: _fullscreenIndex!,
              onClose: _closeFullscreen,
            ),
        ],
      ),
    );
  }
}

class _PhotoItem {
  const _PhotoItem({
    required this.id,
    required this.url,
    required this.authorName,
    this.isOwn = false,
  });

  final String id;
  final String url;
  final String authorName;
  final bool isOwn;
}

class _PhotoGrid extends StatelessWidget {
  const _PhotoGrid({
    required this.photos,
    required this.onTap,
    this.emptyMessage,
  });

  final List<_PhotoItem> photos;
  final void Function(int index) onTap;
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) {
      return Center(
        child: Text(
          emptyMessage ?? 'Chưa có ảnh',
          style: AppTextStyles.bodyMd.copyWith(color: Colors.white54),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(2),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 2,
        mainAxisSpacing: 2,
        childAspectRatio: 1,
      ),
      itemCount: photos.length,
      itemBuilder: (_, i) {
        final photo = photos[i];
        return GestureDetector(
          onTap: () => onTap(i),
          child: Hero(
            tag: photo.id,
            child: CachedNetworkImage(
              imageUrl: photo.url,
              fit: BoxFit.cover,
              placeholder: (_, _) => Container(color: Colors.grey[850]),
              errorWidget: (_, _, _) => Container(
                color: Colors.grey[900],
                child: const Icon(Icons.broken_image_outlined,
                    color: Colors.white30, size: 28),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FullscreenViewer extends StatefulWidget {
  const _FullscreenViewer({
    required this.photos,
    required this.initialIndex,
    required this.onClose,
  });

  final List<_PhotoItem> photos;
  final int initialIndex;
  final VoidCallback onClose;

  @override
  State<_FullscreenViewer> createState() => _FullscreenViewerState();
}

class _FullscreenViewerState extends State<_FullscreenViewer> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final photo = widget.photos[_currentIndex];

    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null && details.primaryVelocity!.abs() > 300) {
          widget.onClose();
        }
      },
      child: Container(
        color: Colors.black.withValues(alpha: 0.95),
        child: Stack(
          children: [
            // ── PageView ──
            PageView.builder(
              controller: _pageController,
              itemCount: widget.photos.length,
              onPageChanged: (i) => setState(() => _currentIndex = i),
              itemBuilder: (_, i) {
                final p = widget.photos[i];
                return Center(
                  child: Hero(
                    tag: p.id,
                    child: CachedNetworkImage(
                      imageUrl: p.url,
                      fit: BoxFit.contain,
                      placeholder: (_, _) =>
                          const CircularProgressIndicator(
                            color: AppColors.actionPrimary,
                          ),
                      errorWidget: (_, _, _) => const Icon(
                        Icons.broken_image_outlined,
                        color: Colors.white30,
                        size: 48,
                      ),
                    ),
                  ),
                );
              },
            ),

            // ── Top bar ──
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.space3),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                      onPressed: widget.onClose,
                    ),
                    const Spacer(),
                    Text(
                      '${_currentIndex + 1} / ${widget.photos.length}',
                      style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.share_outlined, color: Colors.white),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ),

            // ── Bottom author ──
            Positioned(
              left: 0,
              right: 0,
              bottom: MediaQuery.of(context).padding.bottom + AppSpacing.layoutSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
                child: Text(
                  '📷 ${photo.authorName}',
                  style: AppTextStyles.caption.copyWith(color: Colors.white70),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

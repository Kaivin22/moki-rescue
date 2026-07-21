import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../../features/itinerary/presentation/providers/itinerary_providers.dart';
import '../../../../features/itinerary/domain/models/itinerary.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-38: CommunityFeedScreen
/// Feed of public itineraries from community
/// Filter: Latest | Popular | Following
/// ═══════════════════════════════════════════════════════

class CommunityFeedScreen extends ConsumerStatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  ConsumerState<CommunityFeedScreen> createState() =>
      _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends ConsumerState<CommunityFeedScreen> {
  String _filter = 'latest';
  final _scrollController = ScrollController();
  bool _showFab = false;

  static const _filters = [
    (id: 'latest', label: '🕐 Mới nhất'),
    (id: 'popular', label: '🔥 Phổ biến'),
    (id: 'following', label: '👥 Đang theo dõi'),
    (id: 'nearme', label: '📍 Gần đây'),
  ];


  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      final showFab = _scrollController.offset > 300;
      if (showFab != _showFab) setState(() => _showFab = showFab);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(publicItinerariesProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Cộng đồng',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
              icon: const Icon(Icons.search_rounded), onPressed: () {}),
          IconButton(
              icon: const Icon(Icons.leaderboard_rounded),
              tooltip: 'Bảng xếp hạng',
              onPressed: () => context.push(AppRoutes.leaderboard)),
        ],
      ),
      body: Column(
        children: [
          // ── Filter chips ──
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.layoutSm, vertical: 4),
              itemCount: _filters.length,
              itemBuilder: (_, i) {
                final f = _filters[i];
                return Padding(
                  padding:
                      const EdgeInsets.only(right: AppSpacing.space2),
                  child: TagChip(
                    label: f.label,
                    isSelected: _filter == f.id,
                    variant: TagChipVariant.filter,
                    onTap: () => setState(() => _filter = f.id),
                  ),
                );
              },
            ),
          ),

          // ── Feed ──
          Expanded(
            child: feedAsync.when(
              loading: () => const LoadingShimmerList(
                variant: ShimmerVariant.itineraryCard,
                itemCount: 3,
              ),
              error: (e, _) =>
                  EmptyState(type: EmptyStateType.noTrips),
              data: (items) => items.isEmpty
                  ? EmptyState(type: EmptyStateType.noTrips)
                  : ListView.separated(
                      controller: _scrollController,
                      padding:
                          const EdgeInsets.all(AppSpacing.layoutSm),
                      itemCount: items.length,
                      separatorBuilder: (_, index) =>
                          const SizedBox(height: AppSpacing.space4),
                      itemBuilder: (_, i) => _FeedCard(
                        item: _FeedItem.fromItinerary(items[i]),
                        onTap: () => context.push(
                          AppRoutes.publicItinerary,
                          extra: items[i].id,
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
      floatingActionButton: AnimatedSlide(
        duration: const Duration(milliseconds: 200),
        offset: _showFab ? Offset.zero : const Offset(0, 2),
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 200),
          opacity: _showFab ? 1 : 0,
          child: FloatingActionButton.small(
            onPressed: () => _scrollController.animateTo(
              0,
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOut,
            ),
            backgroundColor: AppColors.actionPrimary,
            child: const Icon(Icons.keyboard_arrow_up_rounded, color: Colors.white),
          ),
        ),
      ),
    );
  }
}

class _FeedItem {
  const _FeedItem({
    required this.id,
    required this.authorName,
    required this.authorAvatar,
    required this.timeAgo,
    required this.itineraryTitle,
    required this.itineraryImage,
    required this.numDays,
    required this.likes,
    required this.comments,
    required this.saves,
    required this.tags,
  });

  final String id;
  final String authorName;
  final String authorAvatar;
  final String timeAgo;
  final String itineraryTitle;
  final String itineraryImage;
  final int numDays;
  final int likes;
  final int comments;
  final int saves;
  final List<String> tags;

  factory _FeedItem.fromItinerary(Itinerary it) {
    final ago = DateTime.now().difference(it.createdAt);
    final timeAgo = ago.inDays > 0
        ? '${ago.inDays} ngày trước'
        : ago.inHours > 0
            ? '${ago.inHours} giờ trước'
            : '${ago.inMinutes} phút trước';

    return _FeedItem(
      id: it.id,
      authorName: it.authorName ?? 'Du khách',
      authorAvatar: it.authorAvatarUrl ?? '',
      timeAgo: timeAgo,
      itineraryTitle: it.title,
      itineraryImage: it.thumbnailUrl ?? '',
      numDays: it.numDays,
      likes: it.likeCount,
      comments: 0,
      saves: it.cloneCount,
      tags: [],
    );
  }
}

class _FeedCard extends StatefulWidget {
  const _FeedCard({required this.item, this.onTap});
  final _FeedItem item;
  final VoidCallback? onTap;

  @override
  State<_FeedCard> createState() => _FeedCardState();
}

class _FeedCardState extends State<_FeedCard> {
  bool _liked = false;
  bool _saved = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Author row ──
          Padding(
            padding: const EdgeInsets.all(AppSpacing.space3),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: SagePalette.sage200,
                  backgroundImage: CachedNetworkImageProvider(item.authorAvatar),
                ),
                const SizedBox(width: AppSpacing.space2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.authorName, style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600)),
                      Text(item.timeAgo, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.more_horiz_rounded, size: 20), onPressed: () {}),
              ],
            ),
          ),

          // ── Cover image ──
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(0), topRight: Radius.circular(0)),
            child: CachedNetworkImage(
              imageUrl: item.itineraryImage,
              height: 180,
              width: double.infinity,
              fit: BoxFit.cover,
              placeholder: (_, _) => Container(height: 180, color: SagePalette.sage200),
              errorWidget: (_, _, _) => Container(height: 180, color: SagePalette.sage300),
            ),
          ),

          // ── Title + tags ──
          Padding(
            padding: const EdgeInsets.all(AppSpacing.space3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text('${item.numDays} ngày', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
                const SizedBox(height: AppSpacing.space1),
                Text(item.itineraryTitle, style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: AppSpacing.space2),
                Wrap(
                  spacing: AppSpacing.space2,
                  runSpacing: AppSpacing.space1,
                  children: item.tags.map((t) => TagChip(label: t, variant: TagChipVariant.displayOnly)).toList(),
                ),
              ],
            ),
          ),

          // ── Actions ──
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.space2, 0, AppSpacing.space2, AppSpacing.space2),
            child: Row(
              children: [
                _ActionBtn(
                  icon: _liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  label: '${item.likes + (_liked ? 1 : 0)}',
                  color: _liked ? AppColors.statusError : AppColors.textSecondary,
                  onTap: () => setState(() => _liked = !_liked),
                ),
                _ActionBtn(icon: Icons.chat_bubble_outline_rounded, label: '${item.comments}', onTap: () {}),
                _ActionBtn(
                  icon: _saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                  label: '${item.saves + (_saved ? 1 : 0)}',
                  color: _saved ? AppColors.actionPrimary : AppColors.textSecondary,
                  onTap: () => setState(() => _saved = !_saved),
                ),
                const Spacer(),
                _ActionBtn(icon: Icons.share_outlined, label: '', onTap: () {}),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({required this.icon, required this.label, required this.onTap, this.color});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space2, vertical: AppSpacing.space2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: color ?? AppColors.textSecondary),
              if (label.isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(label, style: AppTextStyles.caption.copyWith(color: color ?? AppColors.textSecondary, fontWeight: FontWeight.w500)),
              ],
            ],
          ),
        ),
      );
}

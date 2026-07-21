import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
// ignore_for_file: unused_import
import '../providers/community_providers.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-39: LeaderboardScreen
/// Top travellers ranked by trips/reviews/saves
/// Tab: Tuần | Tháng | Toàn thời gian
/// ═══════════════════════════════════════════════════════

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() =>
      _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String _metric = 'trips';

  static const _metrics = [
    (id: 'trips', label: '🗺 Lịch trình'),
    (id: 'reviews', label: '⭐ Đánh giá'),
    (id: 'saves', label: '🔖 Yêu thích'),
  ];

  static const _topUsers = [
    _LeaderEntry(rank: 1, name: 'TravelVlog VN', username: '@travelvn', avatarUrl: 'https://picsum.photos/seed/u6/80/80', score: 48, badge: '🥇'),
    _LeaderEntry(rank: 2, name: 'Hội An Guide', username: '@hoianguide', avatarUrl: 'https://picsum.photos/seed/u7/80/80', score: 31, badge: '🥈'),
    _LeaderEntry(rank: 3, name: 'Đinh Thị Mai', username: '@mai.dng', avatarUrl: 'https://picsum.photos/seed/u5/80/80', score: 15, badge: '🥉'),
    _LeaderEntry(rank: 4, name: 'Nguyễn Minh Tú', username: '@minhtu.travel', avatarUrl: 'https://picsum.photos/seed/avatar/80/80', score: 8, badge: ''),
    _LeaderEntry(rank: 5, name: 'Lê Bảo Long', username: '@baolong', avatarUrl: 'https://picsum.photos/seed/u2/80/80', score: 7, badge: ''),
    _LeaderEntry(rank: 6, name: 'Trần Lan Anh', username: '@lan.anh', avatarUrl: 'https://picsum.photos/seed/u1/80/80', score: 5, badge: ''),
    _LeaderEntry(rank: 7, name: 'Phạm Thu Hà', username: '@thuha.travel', avatarUrl: 'https://picsum.photos/seed/u3/80/80', score: 3, badge: ''),
  ];

  // Current user rank (mock)
  static const _myRank = 4;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Bảng xếp hạng', style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.actionPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.actionPrimary,
          indicatorWeight: 2,
          labelStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Tuần'), Tab(text: 'Tháng'), Tab(text: 'Tất cả')],
        ),
      ),
      body: Column(
        children: [
          // ── Metric selector ──
          Padding(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            child: Row(
              children: _metrics.map((m) {
                final isActive = _metric == m.id;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _metric = m.id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(right: AppSpacing.space2),
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.space2),
                      decoration: BoxDecoration(
                        color: isActive ? AppColors.actionPrimary : AppColors.backgroundSecondary,
                        borderRadius: AppRadius.cardBorder,
                        border: Border.all(
                          color: isActive ? AppColors.actionPrimary : AppColors.borderDefault,
                        ),
                      ),
                      child: Text(
                        m.label,
                        textAlign: TextAlign.center,
                        style: AppTextStyles.caption.copyWith(
                          color: isActive ? AppColors.textOnPrimary : AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // ── Podium: top 3 ──
          _PodiumSection(top3: _topUsers.take(3).toList(), metric: _metric),

          const SizedBox(height: AppSpacing.space3),

          // ── Rest of list ──
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
              itemCount: _topUsers.length - 3,
              separatorBuilder: (_, _) => const Divider(height: 1, indent: 60),
              itemBuilder: (_, i) {
                final entry = _topUsers[i + 3];
                final isMe = entry.rank == _myRank;
                return Container(
                  color: isMe ? AppColors.actionPrimary.withValues(alpha: 0.06) : null,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.space3),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 32,
                          child: Text(
                            '#${entry.rank}',
                            style: AppTextStyles.bodyMd.copyWith(
                              fontWeight: FontWeight.w700,
                              color: isMe ? AppColors.actionPrimary : AppColors.textSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space2),
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: SagePalette.sage200,
                          backgroundImage: CachedNetworkImageProvider(entry.avatarUrl),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(entry.name, style: AppTextStyles.bodyMd.copyWith(fontWeight: isMe ? FontWeight.w700 : FontWeight.w500)),
                                  if (isMe) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppColors.actionPrimary.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text('Bạn', style: AppTextStyles.caption.copyWith(color: AppColors.actionPrimary, fontWeight: FontWeight.w600)),
                                    ),
                                  ],
                                ],
                              ),
                              Text(entry.username, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Text(
                          '${entry.score}',
                          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
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

class _LeaderEntry {
  const _LeaderEntry({
    required this.rank,
    required this.name,
    required this.username,
    required this.avatarUrl,
    required this.score,
    required this.badge,
  });

  final int rank;
  final String name;
  final String username;
  final String avatarUrl;
  final int score;
  final String badge;
}

class _PodiumSection extends StatelessWidget {
  const _PodiumSection({required this.top3, required this.metric});
  final List<_LeaderEntry> top3;
  final String metric;

  String get _metricLabel => switch (metric) {
    'trips' => 'lịch trình',
    'reviews' => 'đánh giá',
    _ => 'yêu thích',
  };

  @override
  Widget build(BuildContext context) {
    if (top3.length < 3) return const SizedBox.shrink();

    final first = top3[0];
    final second = top3[1];
    final third = top3[2];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd
          Expanded(child: _PodiumColumn(entry: second, height: 80, metricLabel: _metricLabel)),
          const SizedBox(width: AppSpacing.space2),
          // 1st
          Expanded(child: _PodiumColumn(entry: first, height: 110, metricLabel: _metricLabel, isFirst: true)),
          const SizedBox(width: AppSpacing.space2),
          // 3rd
          Expanded(child: _PodiumColumn(entry: third, height: 60, metricLabel: _metricLabel)),
        ],
      ),
    );
  }
}

class _PodiumColumn extends StatelessWidget {
  const _PodiumColumn({
    required this.entry,
    required this.height,
    required this.metricLabel,
    this.isFirst = false,
  });

  final _LeaderEntry entry;
  final double height;
  final String metricLabel;
  final bool isFirst;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          if (entry.badge.isNotEmpty)
            Text(entry.badge, style: TextStyle(fontSize: isFirst ? 32 : 24)),
          const SizedBox(height: AppSpacing.space1),
          CircleAvatar(
            radius: isFirst ? 30 : 22,
            backgroundColor: SagePalette.sage200,
            backgroundImage: CachedNetworkImageProvider(entry.avatarUrl),
          ),
          const SizedBox(height: AppSpacing.space2),
          Text(entry.name.split(' ').last, style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          Text('${entry.score} $metricLabel', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.space2),
          Container(
            height: height,
            decoration: BoxDecoration(
              color: isFirst
                  ? AppColors.actionPrimary
                  : entry.rank == 2
                      ? SagePalette.sage300
                      : SagePalette.sage200,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: Center(
              child: Text(
                '#${entry.rank}',
                style: AppTextStyles.h4.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isFirst ? AppColors.textOnPrimary : AppColors.textPrimary,
                ),
              ),
            ),
          ),
        ],
      );
}

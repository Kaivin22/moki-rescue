import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-16: VoteCard
/// Thumbnail + name + vote bars + vote buttons
/// States: not-voted | voted | results-only
/// ═══════════════════════════════════════════════════════

class VoteCard extends StatelessWidget {
  const VoteCard({
    super.key,
    required this.placeName,
    required this.category,
    this.thumbnailUrl,
    this.upCount = 0,
    this.downCount = 0,
    this.hasVoted = false,
    this.userVote,
    this.onUpVote,
    this.onDownVote,
    this.showResultsOnly = false,
    this.rank,
  });

  /// Tên địa điểm
  final String placeName;

  /// Category (để hiển thị emoji)
  final String category;

  /// URL thumbnail
  final String? thumbnailUrl;

  /// Số vote đồng ý
  final int upCount;

  /// Số vote không đồng ý
  final int downCount;

  /// User đã vote chưa
  final bool hasVoted;

  /// Vote của user ('up' hoặc 'down')
  final String? userVote;

  /// Callback vote đồng ý
  final VoidCallback? onUpVote;

  /// Callback vote không đồng ý
  final VoidCallback? onDownVote;

  /// Chỉ hiển thị kết quả (không cho vote)
  final bool showResultsOnly;

  /// Thứ hạng (hiển thị medal emoji)
  final int? rank;

  /// Tổng số vote
  int get _totalVotes => upCount + downCount;

  /// Tỉ lệ vote up (0.0 → 1.0)
  double get _upRatio => _totalVotes > 0 ? upCount / _totalVotes : 0.5;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.componentPad),
      decoration: BoxDecoration(
        color: CardTokens.bg,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(
          color: CardTokens.border,
          width: AppBorderWidth.thin,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Header: thumbnail + name ──
          Row(
            children: [
              // Medal rank
              if (rank != null) ...[
                Text(_rankEmoji(rank!), style: const TextStyle(fontSize: 24)),
                const SizedBox(width: AppSpacing.space2),
              ],

              // Thumbnail 64×64
              if (thumbnailUrl != null)
                ClipRRect(
                  borderRadius: AppRadius.thumbnailBorder,
                  child: CachedNetworkImage(
                    imageUrl: thumbnailUrl!,
                    width: 64,
                    height: 64,
                    fit: BoxFit.cover,
                    placeholder: (_, _) => Container(
                      width: 64,
                      height: 64,
                      color: SagePalette.sage200,
                    ),
                    errorWidget: (_, _, _) => Container(
                      width: 64,
                      height: 64,
                      color: SagePalette.sage200,
                      child: const Icon(
                        Icons.image,
                        color: SagePalette.sage400,
                      ),
                    ),
                  ),
                ),

              const SizedBox(width: AppSpacing.space3),

              // Name + category
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      placeName,
                      style: AppTextStyles.bodyMd.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      category,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.space3),

          // ── Vote bar (khi đã vote hoặc results-only) ──
          if (hasVoted || showResultsOnly) ...[
            // Vote counts
            Row(
              children: [
                Text(
                  '👍 $upCount',
                  style: AppTextStyles.bodySm.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _upRatio,
                      minHeight: 8,
                      backgroundColor: AppColors.statusError.withValues(
                        alpha: 0.2,
                      ),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.actionPrimary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                Text(
                  '👎 $downCount',
                  style: AppTextStyles.bodySm.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            if (hasVoted && !showResultsOnly) ...[
              const SizedBox(height: AppSpacing.space2),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space3,
                    vertical: AppSpacing.space1,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: AppRadius.chipBorder,
                  ),
                  child: Text(
                    'Đã bình chọn ${userVote == 'up' ? '👍' : '👎'}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ]
          // ── Vote buttons (chưa vote) ──
          else ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onUpVote,
                    icon: const Text('👍', style: TextStyle(fontSize: 16)),
                    label: const Text('Đồng ý'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.actionPrimary,
                      foregroundColor: AppColors.textOnPrimary,
                      minimumSize: const Size(0, 44),
                      shape: const StadiumBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.space3),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onDownVote,
                    icon: const Text('👎', style: TextStyle(fontSize: 16)),
                    label: const Text('Không'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      minimumSize: const Size(0, 44),
                      shape: const StadiumBorder(),
                      side: const BorderSide(color: AppColors.borderDefault),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// Medal emoji theo thứ hạng
  String _rankEmoji(int rank) => switch (rank) {
    1 => '🥇',
    2 => '🥈',
    3 => '🥉',
    _ => '#$rank',
  };
}

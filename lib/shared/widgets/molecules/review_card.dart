import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../atoms/star_rating.dart';
import '../atoms/tag_chip.dart';

/// ═══════════════════════════════════════════════════════
/// C-14: ReviewCard
/// Avatar + stars + visit chips + highlights + expandable comment
/// ═══════════════════════════════════════════════════════

class ReviewCard extends StatefulWidget {
  const ReviewCard({
    super.key,
    required this.userName,
    required this.rating,
    required this.createdAt,
    this.avatarUrl,
    this.visitType,
    this.visitMonth,
    this.highlights,
    this.comment,
    this.helpfulCount = 0,
    this.isHelpful = false,
    this.onHelpfulTap,
  });

  /// Tên người đánh giá
  final String userName;

  /// Điểm đánh giá (1-5)
  final int rating;

  /// Thời gian tạo
  final DateTime createdAt;

  /// URL avatar
  final String? avatarUrl;

  /// Loại chuyến đi (solo, couple, family, group)
  final String? visitType;

  /// Tháng đến thăm
  final int? visitMonth;

  /// Điểm nổi bật
  final List<String>? highlights;

  /// Nội dung đánh giá
  final String? comment;

  /// Số người thấy hữu ích
  final int helpfulCount;

  /// User hiện tại đã vote helpful chưa
  final bool isHelpful;

  /// Callback khi tap "Hữu ích"
  final VoidCallback? onHelpfulTap;

  @override
  State<ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends State<ReviewCard> {
  bool _isExpanded = false;

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
        children: [
          // ── Header: avatar + name + date ──
          Row(
            children: [
              // Avatar 40px với sage ring
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: SagePalette.sage300,
                    width: 2,
                  ),
                ),
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: SagePalette.sage200,
                  backgroundImage: widget.avatarUrl != null
                      ? CachedNetworkImageProvider(widget.avatarUrl!)
                      : null,
                  child: widget.avatarUrl == null
                      ? Text(
                          widget.userName.isNotEmpty
                              ? widget.userName[0].toUpperCase()
                              : '?',
                          style: AppTextStyles.bodyMd.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        )
                      : null,
                ),
              ),

              const SizedBox(width: AppSpacing.space3),

              // Name + date
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.userName,
                      style: AppTextStyles.bodyMd.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _formatDate(widget.createdAt),
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

          // ── Stars ──
          StarRating(
            rating: widget.rating.toDouble(),
            size: StarSize.sm,
          ),

          // ── Visit info chips ──
          if (widget.visitType != null || widget.visitMonth != null) ...[
            const SizedBox(height: AppSpacing.space2),
            Wrap(
              spacing: AppSpacing.space2,
              children: [
                if (widget.visitType != null)
                  TagChip(
                    label: _visitTypeLabel(widget.visitType!),
                    variant: TagChipVariant.displayOnly,
                    leading: Text(
                      _visitTypeEmoji(widget.visitType!),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                if (widget.visitMonth != null)
                  TagChip(
                    label: 'Tháng ${widget.visitMonth}',
                    variant: TagChipVariant.displayOnly,
                    leading: const Text('📅', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ],

          // ── Highlights ──
          if (widget.highlights != null && widget.highlights!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.space2),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space1,
              children: widget.highlights!
                  .map((h) => TagChip(
                        label: h,
                        variant: TagChipVariant.displayOnly,
                      ))
                  .toList(),
            ),
          ],

          // ── Comment (expandable) ──
          if (widget.comment != null && widget.comment!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.space3),
            GestureDetector(
              onTap: () => setState(() => _isExpanded = !_isExpanded),
              child: Text(
                widget.comment!,
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textPrimary,
                ),
                maxLines: _isExpanded ? null : 3,
                overflow: _isExpanded ? null : TextOverflow.ellipsis,
              ),
            ),
            if (!_isExpanded && (widget.comment?.length ?? 0) > 120)
              GestureDetector(
                onTap: () => setState(() => _isExpanded = true),
                child: Text(
                  'Xem thêm',
                  style: AppTextStyles.bodySm.copyWith(
                    color: AppColors.textLink,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],

          // ── Helpful button ──
          const SizedBox(height: AppSpacing.space3),
          Row(
            children: [
              if (widget.helpfulCount > 0)
                Text(
                  '${widget.helpfulCount} người thấy hữu ích',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              const Spacer(),
              GestureDetector(
                onTap: widget.onHelpfulTap,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      widget.isHelpful
                          ? Icons.thumb_up_rounded
                          : Icons.thumb_up_outlined,
                      size: 16,
                      color: widget.isHelpful
                          ? AppColors.actionPrimary
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: AppSpacing.space1),
                    Text(
                      'Hữu ích',
                      style: AppTextStyles.caption.copyWith(
                        color: widget.isHelpful
                            ? AppColors.actionPrimary
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Format ngày: "15/06/2026"
  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/'
        '${dt.year}';
  }

  /// Label loại chuyến đi
  String _visitTypeLabel(String type) => switch (type) {
    'solo' => 'Một mình',
    'couple' => 'Cặp đôi',
    'family' => 'Gia đình',
    'group' => 'Nhóm bạn',
    _ => type,
  };

  /// Emoji loại chuyến đi
  String _visitTypeEmoji(String type) => switch (type) {
    'solo' => '🧑',
    'couple' => '💑',
    'family' => '👨‍👩‍👧',
    'group' => '👥',
    _ => '👤',
  };
}

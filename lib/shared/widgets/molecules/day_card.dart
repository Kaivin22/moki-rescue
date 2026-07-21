import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-12: DayCard
/// Expandable/collapsible, amber left bar
/// Day number 32sp, AnimatedContainer
/// ═══════════════════════════════════════════════════════

class DayCard extends StatefulWidget {
  const DayCard({
    super.key,
    required this.dayNumber,
    this.title,
    this.estimatedCost,
    this.isExpanded = false,
    this.onToggle,
    this.child,
  });

  /// Số thứ tự ngày (1, 2, 3...)
  final int dayNumber;

  /// Tiêu đề ngày (tuỳ chỉnh)
  final String? title;

  /// Chi phí ước tính (VND)
  final int? estimatedCost;

  /// Trạng thái mở rộng
  final bool isExpanded;

  /// Callback khi toggle expand/collapse
  final VoidCallback? onToggle;

  /// Nội dung bên trong khi expand (danh sách PlaceTimelineTile)
  final Widget? child;

  @override
  State<DayCard> createState() => _DayCardState();
}

class _DayCardState extends State<DayCard> with SingleTickerProviderStateMixin {
  late final AnimationController _chevronController;
  late final Animation<double> _chevronRotation;

  @override
  void initState() {
    super.initState();
    _chevronController = AnimationController(
      duration: const Duration(milliseconds: 250),
      vsync: this,
    );
    _chevronRotation = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(parent: _chevronController, curve: Curves.easeInOut),
    );

    if (widget.isExpanded) {
      _chevronController.value = 1;
    }
  }

  @override
  void didUpdateWidget(DayCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isExpanded != oldWidget.isExpanded) {
      // Kiểm tra reduced motion
      final reduceMotion = MediaQuery.of(context).disableAnimations;
      if (reduceMotion) {
        _chevronController.value = widget.isExpanded ? 1 : 0;
      } else {
        widget.isExpanded
            ? _chevronController.forward()
            : _chevronController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _chevronController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CardTokens.bg,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(
          color: CardTokens.border,
          width: AppBorderWidth.thin,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Header (luôn hiển thị) ──
          GestureDetector(
            onTap: widget.onToggle,
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              height: 72,
              child: Row(
                children: [
                  // Amber left bar
                  Container(
                    width: 4,
                    height: 72,
                    color: AppColors.actionPrimary,
                  ),

                  const SizedBox(width: AppSpacing.space4),

                  // Day number (lớn, amber, bold)
                  Text(
                    '${widget.dayNumber}',
                    style: AppTextStyles.h1.copyWith(
                      color: AppColors.actionPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(width: AppSpacing.space3),

                  // Title + cost
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.title ?? 'Ngày ${widget.dayNumber}',
                          style: AppTextStyles.bodyMd.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (widget.estimatedCost != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            '~${_formatCurrency(widget.estimatedCost!)}đ',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Chevron animation
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.space4),
                    child: RotationTransition(
                      turns: _chevronRotation,
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: AppColors.textSecondary,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Expandable content ──
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 250),
            crossFadeState: widget.isExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: widget.child != null
                ? Padding(
                    padding: const EdgeInsets.only(
                      left: AppSpacing.space4,
                      right: AppSpacing.space4,
                      bottom: AppSpacing.space4,
                    ),
                    child: widget.child,
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  /// Format số tiền VND
  String _formatCurrency(int amount) {
    final str = amount.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buffer.write('.');
      buffer.write(str[i]);
    }
    return buffer.toString();
  }
}

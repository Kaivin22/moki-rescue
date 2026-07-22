import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// C-19: EmptyState
/// 7 variants khác nhau cho các trạng thái trống
/// Center: icon + title + subtitle + optional CTA
/// ═══════════════════════════════════════════════════════

/// Loại empty state
enum EmptyStateType {
  noTrips,
  noSaved,
  noResults,
  noInternet,
  noReviews,
  noChat,
  noTickets,
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.type,
    this.customTitle,
    this.customSubtitle,
    this.actionLabel,
    this.onAction,
    this.queryText,
  });

  /// Loại empty state
  final EmptyStateType type;

  /// Override tiêu đề
  final String? customTitle;

  /// Override phụ đề
  final String? customSubtitle;

  /// Label cho nút CTA (null = ẩn)
  final String? actionLabel;

  /// Callback cho nút CTA
  final VoidCallback? onAction;

  /// Từ khóa tìm kiếm (cho noResults)
  final String? queryText;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Icon / Illustration placeholder ──
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(_emoji, style: const TextStyle(fontSize: 48)),
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Title ──
            Text(
              customTitle ?? _defaultTitle,
              style: AppTextStyles.h3.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: AppSpacing.space3),

            // ── Subtitle ──
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.space8,
              ),
              child: Text(
                customSubtitle ?? _defaultSubtitle,
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),

            // ── Query text (cho noResults) ──
            if (type == EmptyStateType.noResults && queryText != null) ...[
              const SizedBox(height: AppSpacing.space2),
              Text(
                '"$queryText"',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.actionPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],

            // ── CTA button ──
            if (actionLabel != null) ...[
              const SizedBox(height: AppSpacing.layoutMd),
              SizedBox(
                width: 240,
                child: AppButton(label: actionLabel!, onPressed: onAction),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Emoji placeholder cho illustration (sẽ thay bằng SVG sau)
  String get _emoji => switch (type) {
    EmptyStateType.noTrips => '🧳',
    EmptyStateType.noSaved => '💛',
    EmptyStateType.noResults => '🔍',
    EmptyStateType.noInternet => '📡',
    EmptyStateType.noReviews => '⭐',
    EmptyStateType.noChat => '🤖',
    EmptyStateType.noTickets => '🎧',
  };

  /// Title mặc định
  String get _defaultTitle => switch (type) {
    EmptyStateType.noTrips => 'Chưa có lịch trình nào',
    EmptyStateType.noSaved => 'Chưa lưu địa điểm nào',
    EmptyStateType.noResults => 'Không tìm thấy kết quả',
    EmptyStateType.noInternet => 'Không có kết nối',
    EmptyStateType.noReviews => 'Chưa có đánh giá nào',
    EmptyStateType.noChat => 'Bắt đầu hỏi đáp',
    EmptyStateType.noTickets => 'Chưa có yêu cầu nào',
  };

  /// Subtitle mặc định
  String get _defaultSubtitle => switch (type) {
    EmptyStateType.noTrips =>
      'Tạo lịch trình đầu tiên và khám phá Đà Nẵng theo cách của bạn!',
    EmptyStateType.noSaved => 'Tap vào ♥ để lưu các địa điểm yêu thích.',
    EmptyStateType.noResults => 'Thử tìm với từ khóa khác hoặc bỏ bớt bộ lọc.',
    EmptyStateType.noInternet => 'Kiểm tra lại kết nối mạng và thử lại.',
    EmptyStateType.noReviews => 'Hãy là người đầu tiên chia sẻ trải nghiệm!',
    EmptyStateType.noChat =>
      'Hỏi về địa điểm, ẩm thực, di chuyển — AI sẽ tư vấn cho bạn.',
    EmptyStateType.noTickets => 'Bạn chưa gửi yêu cầu hỗ trợ nào.',
  };
}

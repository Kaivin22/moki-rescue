import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_borders.dart';
import '../atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// C-15: QRCodeCard
/// White card, amber border 2px, r=20
/// QR placeholder + link text + share buttons
/// Lưu ý: qr_flutter sẽ thêm ở phase Share
/// ═══════════════════════════════════════════════════════

class QRCodeCard extends StatelessWidget {
  const QRCodeCard({
    super.key,
    required this.shareUrl,
    this.title = 'Quét để xem lịch trình',
    this.onShare,
    this.onCopyLink,
    this.qrWidget,
  });

  /// URL chia sẻ
  final String shareUrl;

  /// Tiêu đề card
  final String title;

  /// Callback khi tap "Chia sẻ"
  final VoidCallback? onShare;

  /// Callback khi tap "Sao chép link"
  final VoidCallback? onCopyLink;

  /// Widget QR code (inject từ bên ngoài, dùng qr_flutter)
  /// Nếu null: hiển thị placeholder
  final Widget? qrWidget;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.layoutMd),
      decoration: BoxDecoration(
        color: CardTokens.bg,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(
          color: AppColors.actionPrimary,
          width: AppBorderWidth.thick,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Tiêu đề ──
          Text(
            title,
            style: AppTextStyles.bodyMd.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: AppSpacing.space4),

          // ── QR Code (hoặc placeholder) ──
          SizedBox(
            width: 200,
            height: 200,
            child: qrWidget ??
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.qr_code_2_rounded,
                          size: 80,
                          color: SagePalette.sage400,
                        ),
                        SizedBox(height: AppSpacing.space2),
                        Text('QR Code'),
                      ],
                    ),
                  ),
                ),
          ),

          const SizedBox(height: AppSpacing.space4),

          // ── Link text + copy button ──
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.space3,
              vertical: AppSpacing.space2,
            ),
            decoration: BoxDecoration(
              color: AppColors.backgroundPrimary,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(
                color: AppColors.borderDefault,
                width: AppBorderWidth.thin,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    shareUrl,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: AppSpacing.space2),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: shareUrl));
                    onCopyLink?.call();
                  },
                  child: Text(
                    'Sao chép',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.actionPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.space4),

          // ── Buttons ──
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: 'Chia sẻ',
                  onPressed: onShare,
                  variant: AppButtonVariant.primary,
                  height: 44,
                  prefixIcon: const Icon(Icons.share_rounded, size: 18),
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: AppButton(
                  label: 'Sao chép link',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: shareUrl));
                    onCopyLink?.call();
                  },
                  variant: AppButtonVariant.secondary,
                  height: 44,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

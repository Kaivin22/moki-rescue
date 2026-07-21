import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-73: GeneralErrorScreen
/// Center: broken map icon + error detail + retry + report
/// ═══════════════════════════════════════════════════════

class GeneralErrorScreen extends StatelessWidget {
  const GeneralErrorScreen({
    super.key,
    this.errorMessage,
    this.errorCode,
    required this.onRetry,
    this.onReport,
  });

  final String? errorMessage;
  final String? errorCode;
  final VoidCallback onRetry;
  final VoidCallback? onReport;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.layoutMd),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Illustration placeholder
                Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    color: SagePalette.sage100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.map_outlined,
                    size: 80,
                    color: SagePalette.sage400,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                Text(
                  'Có gì đó sai rồi!',
                  style: AppTextStyles.h2.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),

                if (errorMessage != null) ...[
                  const SizedBox(height: AppSpacing.space3),
                  Text(
                    errorMessage!,
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],

                if (errorCode != null) ...[
                  const SizedBox(height: AppSpacing.space2),
                  Text(
                    'Mã lỗi: $errorCode',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                      fontFamily: 'monospace',
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],

                const SizedBox(height: AppSpacing.layoutXl),

                SizedBox(
                  width: 280,
                  child: AppButton(
                    label: 'Thử lại',
                    onPressed: onRetry,
                    prefixIcon: const Icon(Icons.refresh_rounded, size: 18),
                  ),
                ),

                if (onReport != null) ...[
                  const SizedBox(height: AppSpacing.space3),
                  TextButton(
                    onPressed: onReport,
                    child: Text(
                      'Báo lỗi với hỗ trợ',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.actionSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

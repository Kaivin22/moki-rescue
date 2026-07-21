import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-72: NoInternetScreen
/// Full-screen center: wifi-off icon + retry + offline option
/// ═══════════════════════════════════════════════════════

class NoInternetScreen extends StatelessWidget {
  const NoInternetScreen({
    super.key,
    required this.onRetry,
    this.onViewOffline,
  });

  final VoidCallback onRetry;
  final VoidCallback? onViewOffline;

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
                    Icons.wifi_off_rounded,
                    size: 80,
                    color: SagePalette.sage400,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                Text(
                  'Không có kết nối',
                  style: AppTextStyles.h2.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: AppSpacing.space3),

                Text(
                  'Kiểm tra lại kết nối Wi-Fi hoặc dữ liệu di động của bạn.',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: AppSpacing.layoutXl),

                SizedBox(
                  width: 280,
                  child: AppButton(
                    label: 'Thử lại',
                    onPressed: onRetry,
                    prefixIcon: const Icon(Icons.refresh_rounded, size: 18),
                  ),
                ),

                if (onViewOffline != null) ...[
                  const SizedBox(height: AppSpacing.space3),
                  SizedBox(
                    width: 280,
                    child: AppButton(
                      label: 'Xem lịch trình đã lưu',
                      variant: AppButtonVariant.secondary,
                      onPressed: onViewOffline,
                      prefixIcon: const Icon(
                        Icons.download_done_rounded,
                        size: 18,
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

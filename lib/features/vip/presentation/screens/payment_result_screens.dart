import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// SCREEN-PAYMENT-SUCCESS: Thanh toán thành công
class PaymentSuccessScreen extends StatelessWidget {
  const PaymentSuccessScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.backgroundPrimary,
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.layoutXl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '🎉',
              style: TextStyle(fontSize: 80),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.layoutMd),
            Text(
              'Thanh toán thành công!',
              textAlign: TextAlign.center,
              style: AppTextStyles.h2.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.statusSuccess,
              ),
            ),
            const SizedBox(height: AppSpacing.space3),
            Text(
              'Chào mừng bạn gia nhập VIP!\nTận hưởng tất cả tính năng cao cấp ngay bây giờ. 👑',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: AppSpacing.layoutXl),
            AppButton(
              label: 'Về trang chủ',
              onPressed: () => context.go(AppRoutes.home),
            ),
          ],
        ),
      ),
    ),
  );
}

/// SCREEN-PAYMENT-FAILED: Thanh toán thất bại
class PaymentFailedScreen extends StatelessWidget {
  const PaymentFailedScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.backgroundPrimary,
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.layoutXl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '😔',
              style: TextStyle(fontSize: 80),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.layoutMd),
            Text(
              'Thanh toán thất bại',
              textAlign: TextAlign.center,
              style: AppTextStyles.h2.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.statusError,
              ),
            ),
            const SizedBox(height: AppSpacing.space3),
            Text(
              'Đã xảy ra lỗi trong quá trình thanh toán.\nVui lòng thử lại hoặc chọn phương thức khác.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: AppSpacing.layoutXl),
            AppButton(label: 'Thử lại', onPressed: () => context.pop()),
            const SizedBox(height: AppSpacing.space3),
            TextButton(
              onPressed: () => context.go(AppRoutes.home),
              child: Text(
                'Về trang chủ',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

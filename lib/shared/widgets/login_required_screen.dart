import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-75: LoginRequiredScreen
/// Lock icon + login/register buttons + optional "continue as guest"
/// ═══════════════════════════════════════════════════════

class LoginRequiredScreen extends StatelessWidget {
  const LoginRequiredScreen({
    super.key,
    this.featureDescription,
    required this.onLogin,
    required this.onRegister,
    this.onContinueAsGuest,
  });

  /// Mô tả tính năng cần đăng nhập
  final String? featureDescription;

  final VoidCallback onLogin;
  final VoidCallback onRegister;

  /// Nếu null: không hiển thị "Tiếp tục xem"
  final VoidCallback? onContinueAsGuest;

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
                // Illustration placeholder (locked travel)
                Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    color: SagePalette.sage100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_rounded,
                    size: 80,
                    color: AppColors.actionPrimary,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                Text(
                  'Đăng nhập để tiếp tục',
                  style: AppTextStyles.h2.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),

                if (featureDescription != null) ...[
                  const SizedBox(height: AppSpacing.space3),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space8,
                    ),
                    child: Text(
                      featureDescription!,
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],

                const SizedBox(height: AppSpacing.layoutXl),

                SizedBox(
                  width: 280,
                  child: AppButton(
                    label: 'Đăng nhập',
                    onPressed: onLogin,
                    prefixIcon: const Icon(Icons.login_rounded, size: 18),
                  ),
                ),

                const SizedBox(height: AppSpacing.space3),

                SizedBox(
                  width: 280,
                  child: AppButton(
                    label: 'Tạo tài khoản miễn phí',
                    variant: AppButtonVariant.secondary,
                    onPressed: onRegister,
                    prefixIcon: const Icon(Icons.person_add_outlined, size: 18),
                  ),
                ),

                if (onContinueAsGuest != null) ...[
                  const SizedBox(height: AppSpacing.space3),
                  TextButton(
                    onPressed: onContinueAsGuest,
                    child: Text(
                      'Tiếp tục xem (không lưu)',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textSecondary,
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

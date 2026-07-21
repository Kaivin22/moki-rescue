import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-08: GoogleSignInLoadingScreen
/// Center spinner + text
/// ═══════════════════════════════════════════════════════

class GoogleSignInLoadingScreen extends StatelessWidget {
  const GoogleSignInLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.actionPrimary,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.layoutSm),
            Text(
              'Đang đăng nhập...',
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_text_field.dart';
import '../providers/auth_notifier.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-05: ForgotPasswordScreen
/// AppBar transparent + body center: icon + form + send button
/// ═══════════════════════════════════════════════════════

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _onSend() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) return;

    setState(() => _isLoading = true);
    final success = await ref
        .read(authNotifierProvider.notifier)
        .resetPassword(email);
    if (!mounted) return;
    setState(() => _isLoading = false);

    if (success) {
      // Điều hướng đến EmailSentScreen và truyền email
      context.push(AppRoutes.emailSent, extra: email);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.',
          ),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: AppColors.textPrimary,
          ),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutMd),
        child: Column(
          children: [
            const SizedBox(height: AppSpacing.layoutMd),

            // Illustration
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AmberPalette.amber100,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_reset_rounded,
                size: 60,
                color: AppColors.actionPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            Text(
              'Quên mật khẩu?',
              style: AppTextStyles.h2.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.space3),

            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.space8,
              ),
              child: Text(
                'Nhập email của bạn và chúng tôi sẽ gửi link để đặt lại mật khẩu.',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            AppTextField(
              label: 'Email của bạn',
              hint: 'example@email.com',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _onSend(),
              prefixIcon: const Icon(
                Icons.email_outlined,
                color: AppColors.textSecondary,
                size: 20,
              ),
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            AppButton(
              label: 'Gửi link đặt lại',
              onPressed: _emailController.text.isNotEmpty && !_isLoading
                  ? _onSend
                  : null,
              isLoading: _isLoading,
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            TextButton(
              onPressed: () => context.pop(),
              child: Text(
                '← Quay lại đăng nhập',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.actionSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

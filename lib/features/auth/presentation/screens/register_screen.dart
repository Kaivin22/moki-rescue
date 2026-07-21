import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_text_field.dart';
import '../providers/auth_notifier.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-04: RegisterScreen
/// Cùng layout LoginScreen. Form: họ tên + email + mật khẩu × 2 + terms
/// ═══════════════════════════════════════════════════════

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _nameController.text.isNotEmpty &&
      _emailController.text.isNotEmpty &&
      _passwordController.text.isNotEmpty &&
      _confirmController.text.isNotEmpty &&
      _acceptedTerms;

  Future<void> _onRegister() async {
    if (!_canSubmit) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    await ref.read(authNotifierProvider.notifier).signUpWithEmail(
          email: _emailController.text,
          password: _passwordController.text,
          displayName: _nameController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    // Lắng nghe auth state để điều hướng
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      if (!mounted) return;
      if (next is AuthAuthenticated) {
        // Đăng ký + đăng nhập thành công ngay → home
        context.go(AppRoutes.home);
      } else if (next is AuthUnauthenticated && prev is AuthLoading) {
        // Cần xác nhận email → EmailSentScreen
        context.push(AppRoutes.emailSent,
            extra: _emailController.text.trim());
      } else if (next is AuthError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: AppColors.statusError,
            behavior: SnackBarBehavior.floating,
          ),
        );
        ref.read(authNotifierProvider.notifier).clearError();
      }
    });

    final isLoading = ref.watch(authNotifierProvider) is AuthLoading;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Form(
        key: _formKey,
        child: Stack(
          children: [
            // ── Top sage gradient header ──
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: MediaQuery.of(context).size.height * 0.25,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [SagePalette.sage300, SagePalette.sage200],
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.actionPrimary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.actionPrimary
                                  .withValues(alpha: 0.3),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.person_add_rounded,
                          color: AppColors.textOnPrimary,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.space2),
                      Text(
                        'Tạo tài khoản',
                        style: AppTextStyles.h2.copyWith(
                          color: NeutralPalette.neutral900,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Bottom white card form ──
            Positioned(
              top: MediaQuery.of(context).size.height * 0.20,
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.backgroundCard,
                  borderRadius: AppRadius.sheetBorder,
                ),
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    AppSpacing.layoutMd,
                    AppSpacing.layoutMd,
                    AppSpacing.layoutMd,
                    MediaQuery.of(context).viewInsets.bottom +
                        AppSpacing.layoutMd,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Họ và tên
                      AppTextField(
                        label: 'Họ và tên',
                        hint: 'Nguyễn Văn A',
                        controller: _nameController,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(
                          Icons.person_outline_rounded,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),

                      const SizedBox(height: AppSpacing.space3),

                      // Email
                      AppTextField(
                        label: 'Email',
                        hint: 'example@email.com',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(
                          Icons.email_outlined,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),

                      const SizedBox(height: AppSpacing.space3),

                      // Mật khẩu
                      AppTextField(
                        label: 'Mật khẩu',
                        hint: 'Tối thiểu 6 ký tự',
                        controller: _passwordController,
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(
                          Icons.lock_outline_rounded,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),

                      const SizedBox(height: AppSpacing.space3),

                      // Xác nhận mật khẩu
                      AppTextField(
                        label: 'Xác nhận mật khẩu',
                        hint: 'Nhập lại mật khẩu',
                        controller: _confirmController,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _onRegister(),
                        prefixIcon: const Icon(
                          Icons.lock_outline_rounded,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),

                      const SizedBox(height: AppSpacing.space3),

                      // Terms checkbox
                      CheckboxListTile(
                        value: _acceptedTerms,
                        onChanged: (v) =>
                            setState(() => _acceptedTerms = v ?? false),
                        activeColor: AppColors.actionPrimary,
                        checkColor: AppColors.textOnPrimary,
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: RichText(
                          text: TextSpan(
                            style: AppTextStyles.bodySm.copyWith(
                              color: AppColors.textSecondary,
                            ),
                            children: [
                              const TextSpan(text: 'Tôi đồng ý với '),
                              WidgetSpan(
                                child: GestureDetector(
                                  onTap: () =>
                                      context.push(AppRoutes.termsOfService),
                                  child: Text(
                                    'Điều khoản sử dụng',
                                    style: AppTextStyles.bodySm.copyWith(
                                      color: AppColors.actionSecondary,
                                      fontWeight: FontWeight.w600,
                                      decoration: TextDecoration.underline,
                                      decorationColor: AppColors.actionSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: AppSpacing.layoutSm),

                      // Tạo tài khoản button
                      AppButton(
                        label: 'Tạo tài khoản',
                        onPressed: (_canSubmit && !isLoading) ? _onRegister : null,
                        isLoading: isLoading,
                      ),

                      const SizedBox(height: AppSpacing.space4),

                      // Đã có tài khoản → Đăng nhập
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Đã có tài khoản? ',
                            style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.pop(),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              'Đăng nhập',
                              style: AppTextStyles.bodyMd.copyWith(
                                color: AppColors.actionSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

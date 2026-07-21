import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';
import '../../../../shared/widgets/atoms/app_text_field.dart';
import '../providers/auth_notifier.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-03: LoginScreen
/// Stack: sage gradient header (35%) + white card bottom (65%)
/// Fields: email + password + quên mật khẩu
/// GoogleSignIn button, link to Register
/// ═══════════════════════════════════════════════════════

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onLogin() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await ref.read(authNotifierProvider.notifier).signInWithEmail(
          email: _emailController.text,
          password: _passwordController.text,
        );
  }

  Future<void> _onGoogleSignIn() async {
    await ref.read(authNotifierProvider.notifier).signInWithGoogle();
  }

  @override
  Widget build(BuildContext context) {
    // Lắng nghe auth state để điều hướng
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      if (!mounted) return;
      if (next is AuthAuthenticated) {
        context.go(AppRoutes.home);
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
            // ── Top 35%: Sage gradient header ──
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: MediaQuery.of(context).size.height * 0.35,
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
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: AppColors.actionPrimary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color:
                                  AppColors.actionPrimary.withValues(alpha: 0.3),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.explore_rounded,
                          color: AppColors.textOnPrimary,
                          size: 30,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.space3),
                      Text(
                        'Xin chào! 👋',
                        style: AppTextStyles.h1.copyWith(
                          color: NeutralPalette.neutral900,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // ── Bottom 65%: White card with form ──
            Positioned(
              top: MediaQuery.of(context).size.height * 0.28,
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
                      Text(
                        'Đăng nhập',
                        style: AppTextStyles.h2.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),

                      const SizedBox(height: AppSpacing.layoutSm),

                      // Email field
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
                      ),

                      const SizedBox(height: AppSpacing.space3),

                      // Password field
                      AppTextField(
                        label: 'Mật khẩu',
                        hint: '••••••••',
                        controller: _passwordController,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _onLogin(),
                        prefixIcon: const Icon(
                          Icons.lock_outline_rounded,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                      ),

                      // Forgot password
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () =>
                              context.push(AppRoutes.forgotPassword),
                          child: Text(
                            'Quên mật khẩu?',
                            style: AppTextStyles.bodySm.copyWith(
                              color: AppColors.actionSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),

                      // Login button
                      AppButton(
                        label: 'Đăng nhập',
                        onPressed: isLoading ? null : _onLogin,
                        isLoading: isLoading,
                      ),

                      const SizedBox(height: AppSpacing.layoutSm),

                      // Divider "hoặc"
                      const AppTextDivider(),

                      const SizedBox(height: AppSpacing.layoutSm),

                      // Google sign-in button
                      _GoogleSignInButton(
                        onTap: isLoading ? null : _onGoogleSignIn,
                      ),

                      const SizedBox(height: AppSpacing.layoutSm),

                      // Register link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Chưa có tài khoản? ',
                            style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push(AppRoutes.register),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              'Đăng ký',
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

/// Google sign-in button — white card r=12, Google icon + text
class _GoogleSignInButton extends StatelessWidget {
  const _GoogleSignInButton({this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: onTap == null ? 0.5 : 1.0,
        child: Container(
          height: AppSizes.buttonHeight,
          decoration: BoxDecoration(
            color: AppColors.backgroundCard,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: AppColors.borderDefault,
              width: AppBorderWidth.thin,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, 0.06),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFF4285F4),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Center(
                  child: Text(
                    'G',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Text(
                'Tiếp tục với Google',
                style: AppTextStyles.bodyMd.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

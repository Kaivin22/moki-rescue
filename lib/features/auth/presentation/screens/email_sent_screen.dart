import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-06: EmailSentScreen
/// AnimatedScale checkmark + timer resend button (60s countdown)
/// ═══════════════════════════════════════════════════════

class EmailSentScreen extends StatefulWidget {
  const EmailSentScreen({super.key, required this.email});

  final String email;

  @override
  State<EmailSentScreen> createState() => _EmailSentScreenState();
}

class _EmailSentScreenState extends State<EmailSentScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnim;

  int _secondsLeft = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();

    // Scale animation: 0.5 → 1.0
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _scaleAnim = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.elasticOut,
    );

    final reduceMotion = WidgetsBinding
        .instance
        .platformDispatcher
        .accessibilityFeatures
        .reduceMotion;
    if (reduceMotion) {
      _scaleController.value = 1;
    } else {
      _scaleController.forward();
    }

    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canResend = _secondsLeft <= 0;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutMd),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ── Animated checkmark circle ──
              ScaleTransition(
                scale: _scaleAnim,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    color: AppColors.actionPrimary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: AppColors.textOnPrimary,
                    size: 40,
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.layoutMd),

              Text(
                'Email đã được gửi!',
                style: AppTextStyles.h2.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: AppSpacing.space3),

              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space8,
                ),
                child: Text(
                  'Kiểm tra hộp thư và nhấn vào link để đặt lại mật khẩu.',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              const SizedBox(height: AppSpacing.space4),

              // Email pill
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space4,
                  vertical: AppSpacing.space2,
                ),
                decoration: BoxDecoration(
                  color: AmberPalette.amber100,
                  borderRadius: AppRadius.buttonBorder,
                ),
                child: Text(
                  widget.email,
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.actionPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.layoutXl),

              // Resend button (timer countdown)
              if (!canResend)
                Text(
                  'Gửi lại sau ${_secondsLeft}s',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: SagePalette.sage300,
                    fontWeight: FontWeight.w500,
                  ),
                )
              else
                TextButton(
                  onPressed: () {
                    setState(() => _secondsLeft = 60);
                    _startTimer();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('✅ Đã gửi lại email xác nhận!'),
                      ),
                    );
                  },
                  child: Text(
                    'Gửi lại email',
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.actionSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),

              const SizedBox(height: AppSpacing.space3),

              AppButton(
                label: 'Quay lại đăng nhập',
                variant: AppButtonVariant.secondary,
                onPressed: () {
                  context.go(AppRoutes.login);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

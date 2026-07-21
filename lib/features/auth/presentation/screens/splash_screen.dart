import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../providers/auth_notifier.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-01: SplashScreen
/// Full-screen sage.300 background, logo, animated dots
/// Auto-navigate sau khi AuthNotifier xác định trạng thái
/// ═══════════════════════════════════════════════════════

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  late final List<AnimationController> _dotControllers;
  late final List<Animation<double>> _dotAnimations;

  @override
  void initState() {
    super.initState();
    _initDotAnimations();
  }

  void _initDotAnimations() {
    _dotControllers = List.generate(3, (i) {
      return AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      );
    });

    _dotAnimations = List.generate(3, (i) {
      return Tween<double>(begin: 0.3, end: 1.0).animate(
        CurvedAnimation(parent: _dotControllers[i], curve: Curves.easeInOut),
      );
    });

    // Stagger delay
    for (int i = 0; i < 3; i++) {
      Future.delayed(Duration(milliseconds: i * 200), () {
        if (mounted) _dotControllers[i].repeat(reverse: true);
      });
    }
  }

  @override
  void dispose() {
    for (final c in _dotControllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Lắng nghe authNotifierProvider — navigate khi state không còn là AuthInitial
    ref.listen<AuthState>(authNotifierProvider, (prev, next) {
      if (!mounted) return;
      switch (next) {
        case AuthAuthenticated():
          context.go(AppRoutes.home);
        case AuthUnauthenticated():
          context.go(AppRoutes.onboarding);
        case AuthError():
          context.go(AppRoutes.onboarding);
        default:
          break; // AuthInitial | AuthLoading — đợi tiếp
      }
    });

    final reduceMotion = MediaQuery.of(context).disableAnimations;

    return Scaffold(
      backgroundColor: SagePalette.sage300,
      body: Stack(
        children: [
          // ── Landmark silhouette background (5% opacity) ──
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Opacity(
              opacity: 0.05,
              child: Container(
                height: 200,
                color: NeutralPalette.neutral900,
              ),
            ),
          ),

          // ── Content center ──
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppColors.actionPrimary,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.actionPrimary.withValues(alpha: 0.3),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.explore_rounded,
                    size: 60,
                    color: NeutralPalette.neutral900,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutMd),

                Text(
                  'Lịch Trình Đà Nẵng',
                  style: AppTextStyles.h1.copyWith(
                    color: NeutralPalette.neutral900,
                    fontWeight: FontWeight.w700,
                  ),
                ),

                const SizedBox(height: AppSpacing.space2),

                Text(
                  'Khám phá theo cách của bạn',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: SagePalette.sage500,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutXl),

                // ── Animated dots ──
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (i) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: reduceMotion
                          ? Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: AppColors.actionPrimary,
                                shape: BoxShape.circle,
                              ),
                            )
                          : AnimatedBuilder(
                              animation: _dotAnimations[i],
                              builder: (_, _) => Opacity(
                                opacity: _dotAnimations[i].value,
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: AppColors.actionPrimary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                    );
                  }),
                ),
              ],
            ),
          ),

          // ── Version number ──
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + AppSpacing.space4,
            left: 0,
            right: 0,
            child: Text(
              'v1.0.0',
              style: AppTextStyles.caption.copyWith(
                color: SagePalette.sage500,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-02: OnboardingScreen
/// PageView 3 slides, dot indicator, Bỏ qua / Tiếp tục / Bắt đầu ngay
/// ═══════════════════════════════════════════════════════

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const List<_OnboardingSlide> _slides = [
    _OnboardingSlide(
      iconData: Icons.map_rounded,
      iconColor: AppColors.actionPrimary,
      heading: 'Lập lịch trình thông minh',
      subtitle:
          'Tự động tối ưu lộ trình theo giờ mở cửa, khoảng cách và ngân sách của bạn.',
    ),
    _OnboardingSlide(
      iconData: Icons.group_rounded,
      iconColor: AppColors.actionSecondary,
      heading: 'Chia sẻ với cả nhóm',
      subtitle:
          'Mời bạn bè vote địa điểm, cùng nhau lên kế hoạch cho chuyến đi hoàn hảo.',
    ),
    _OnboardingSlide(
      iconData: Icons.smart_toy_rounded,
      iconColor: AppColors.actionPrimary,
      heading: 'Hỏi gì cũng biết',
      subtitle:
          'AI Gemini trả lời mọi thắc mắc về địa điểm, ẩm thực và di chuyển tại Đà Nẵng.',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _goToLogin();
    }
  }

  void _goToLogin() {
    // TODO: Navigator.of(context).pushReplacementNamed(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      body: Stack(
        children: [
          // ── PageView ──
          PageView.builder(
            controller: _pageController,
            itemCount: _slides.length,
            onPageChanged: (i) => setState(() => _currentPage = i),
            itemBuilder: (_, i) => _OnboardingPage(slide: _slides[i]),
          ),

          // ── "Bỏ qua" button top-right ──
          if (_currentPage < _slides.length - 1)
            Positioned(
              top: MediaQuery.of(context).padding.top + AppSpacing.space2,
              right: AppSpacing.layoutSm,
              child: TextButton(
                onPressed: _goToLogin,
                child: Text(
                  'Bỏ qua',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),

          // ── Bottom sheet (dots + buttons) ──
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _BottomSheet(
              currentPage: _currentPage,
              totalPages: _slides.length,
              onNext: _nextPage,
              onLogin: _currentPage == _slides.length - 1 ? _goToLogin : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// Slide data
class _OnboardingSlide {
  const _OnboardingSlide({
    required this.iconData,
    required this.iconColor,
    required this.heading,
    required this.subtitle,
  });

  final IconData iconData;
  final Color iconColor;
  final String heading;
  final String subtitle;
}

/// Mỗi slide: 58% illustration + 42% bottom card
class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({required this.slide});
  final _OnboardingSlide slide;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Top 58%: illustration placeholder ──
        Expanded(
          flex: 58,
          child: Container(
            width: double.infinity,
            color: SagePalette.sage200,
            child: Center(
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  color: slide.iconColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(slide.iconData, size: 80, color: slide.iconColor),
              ),
            ),
          ),
        ),

        // ── Bottom 42%: card with content ──
        Expanded(
          flex: 42,
          child: Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              color: AppColors.backgroundCard,
              borderRadius: AppRadius.sheetBorder,
            ),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.layoutMd,
              AppSpacing.layoutMd,
              AppSpacing.layoutMd,
              100, // Bottom space for absolute-positioned controls
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  slide.heading,
                  style: AppTextStyles.h2.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.space3),
                Text(
                  slide.subtitle,
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Bottom sheet: dots + CTA buttons
class _BottomSheet extends StatelessWidget {
  const _BottomSheet({
    required this.currentPage,
    required this.totalPages,
    required this.onNext,
    this.onLogin,
  });

  final int currentPage;
  final int totalPages;
  final VoidCallback onNext;
  final VoidCallback? onLogin;

  bool get _isLast => currentPage == totalPages - 1;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.layoutMd,
        AppSpacing.space4,
        AppSpacing.layoutMd,
        MediaQuery.of(context).padding.bottom + AppSpacing.space4,
      ),
      color: AppColors.backgroundCard,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Dots indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(totalPages, (i) {
              final isActive = i == currentPage;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isActive ? 20 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.actionPrimary
                      : SagePalette.sage300,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              );
            }),
          ),

          const SizedBox(height: AppSpacing.layoutMd),

          // CTA button
          AppButton(
            label: _isLast ? 'Bắt đầu ngay' : 'Tiếp tục',
            onPressed: onNext,
          ),

          // Slide 3: thêm "Đăng nhập" button
          if (_isLast) ...[
            const SizedBox(height: AppSpacing.space3),
            AppButton(
              label: 'Đăng nhập',
              onPressed: onLogin,
              variant: AppButtonVariant.secondary,
            ),
          ],
        ],
      ),
    );
  }
}

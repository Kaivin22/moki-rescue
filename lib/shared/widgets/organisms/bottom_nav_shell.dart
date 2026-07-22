import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// C-21: BottomNavigationShell
/// 5 tabs: Trang chủ | Khám phá | Lập lịch | Bản đồ | Hồ sơ
/// Floating white card, radius.3xl top, shadow.md
/// Tab Lập lịch: custom center FAB (amber circle 56px)
/// ═══════════════════════════════════════════════════════

/// Danh sách tab items
enum AppTab { home, discover, create, map, profile }

class BottomNavShell extends StatelessWidget {
  const BottomNavShell({
    super.key,
    required this.currentTab,
    required this.onTabChanged,
    required this.body,
  });

  /// Tab hiện tại
  final AppTab currentTab;

  /// Callback khi chuyển tab
  final ValueChanged<AppTab> onTabChanged;

  /// Nội dung trang hiện tại
  final Widget body;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: body,
      extendBody: true,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.navBarBorder,
          boxShadow: AppShadows.md,
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 72,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // Tab 0: Trang chủ
                _NavItem(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home_rounded,
                  label: 'Trang chủ',
                  isActive: currentTab == AppTab.home,
                  onTap: () => onTabChanged(AppTab.home),
                ),

                // Tab 1: Khám phá
                _NavItem(
                  icon: Icons.explore_outlined,
                  activeIcon: Icons.explore_rounded,
                  label: 'Khám phá',
                  isActive: currentTab == AppTab.discover,
                  onTap: () => onTabChanged(AppTab.discover),
                ),

                // Tab 2: Lập lịch (FAB center)
                _CenterFab(
                  isActive: currentTab == AppTab.create,
                  onTap: () => onTabChanged(AppTab.create),
                ),

                // Tab 3: Bản đồ
                _NavItem(
                  icon: Icons.map_outlined,
                  activeIcon: Icons.map_rounded,
                  label: 'Bản đồ',
                  isActive: currentTab == AppTab.map,
                  onTap: () => onTabChanged(AppTab.map),
                ),

                // Tab 4: Hồ sơ
                _NavItem(
                  icon: Icons.person_outline_rounded,
                  activeIcon: Icons.person_rounded,
                  label: 'Hồ sơ',
                  isActive: currentTab == AppTab.profile,
                  onTap: () => onTabChanged(AppTab.profile),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Nav item thường (icon + label + indicator dot)
class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              size: 24,
              color: isActive ? NavTokens.activeColor : NavTokens.inactiveColor,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTextStyles.caption.copyWith(
                color: isActive
                    ? NavTokens.activeColor
                    : NavTokens.inactiveColor,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 2),
            // Amber dot indicator
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: isActive ? AppSizes.navIndicatorSize : 0,
              height: isActive ? AppSizes.navIndicatorSize : 0,
              decoration: const BoxDecoration(
                color: NavTokens.indicatorBg,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Center FAB — amber circle 56px, ➕ icon
class _CenterFab extends StatelessWidget {
  const _CenterFab({required this.isActive, required this.onTap});

  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.actionPrimary,
              shape: BoxShape.circle,
              boxShadow: AppShadows.amber,
            ),
            child: const Icon(
              Icons.add_rounded,
              color: AppColors.textOnPrimary,
              size: 28,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Lập lịch',
            style: AppTextStyles.caption.copyWith(
              color: isActive ? NavTokens.activeColor : NavTokens.inactiveColor,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

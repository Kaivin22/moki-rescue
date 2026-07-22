import 'package:flutter/material.dart';

import 'tokens/app_colors.dart';
import 'tokens/app_typography.dart';
import 'tokens/app_spacing.dart';
import 'tokens/app_borders.dart';

/// ═══════════════════════════════════════════════════════
/// App Theme — "Nature-Warm Playful"
/// Material 3, tất cả giá trị reference từ design tokens.
/// KHÔNG hardcode bất kỳ giá trị nào.
/// ═══════════════════════════════════════════════════════

abstract final class AppTheme {
  /// Light theme chính của app
  static ThemeData get light => ThemeData(
    useMaterial3: true,

    // ── Color Scheme ──
    colorScheme: const ColorScheme.light(
      primary: AppColors.actionPrimary, // amber.400
      onPrimary: AppColors.textOnPrimary, // neutral.900 — WCAG 7:1
      secondary: AppColors.actionSecondary, // olive.400
      onSecondary: AppColors.textPrimary, // neutral.900
      surface: AppColors.backgroundPrimary, // neutral.50
      onSurface: AppColors.textPrimary, // neutral.900
      surfaceContainerHighest: AppColors.backgroundTinted, // sage.300
      error: AppColors.statusError, // red.500
      onError: AppColors.textOnDark, // white
      outline: AppColors.borderDefault, // sage.300
    ),

    // ── Font ──
    fontFamily: kFontFamily,

    // ── Scaffold ──
    scaffoldBackgroundColor: AppColors.backgroundPrimary,

    // ── AppBar ──
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.backgroundPrimary,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: AppTextStyles.h3.copyWith(color: AppColors.textPrimary),
    ),

    // ── Card ──
    cardTheme: CardThemeData(
      color: CardTokens.bg,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.cardBorder,
        side: BorderSide(color: CardTokens.border, width: AppBorderWidth.thin),
      ),
      margin: EdgeInsets.zero,
    ),

    // ── Elevated Button (Primary CTA) ──
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: ButtonTokens.primaryBg,
        foregroundColor: ButtonTokens.primaryText,
        disabledBackgroundColor: ButtonTokens.disabledBg,
        disabledForegroundColor: ButtonTokens.disabledText,
        minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
        shape: const StadiumBorder(),
        textStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w700),
        elevation: 0,
      ),
    ),

    // ── Outlined Button (Secondary) ──
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ButtonTokens.secondaryText,
        minimumSize: const Size(double.infinity, AppSizes.buttonHeight),
        shape: const StadiumBorder(),
        side: BorderSide(
          color: ButtonTokens.secondaryBorder,
          width: AppBorderWidth.medium,
        ),
        textStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
      ),
    ),

    // ── Text Button ──
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.textLink,
        textStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
      ),
    ),

    // ── Input Decoration ──
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: InputTokens.bg,
      border: OutlineInputBorder(
        borderRadius: AppRadius.inputBorder,
        borderSide: BorderSide(
          color: InputTokens.borderDefault,
          width: AppBorderWidth.thin,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadius.inputBorder,
        borderSide: BorderSide(
          color: InputTokens.borderDefault,
          width: AppBorderWidth.thin,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadius.inputBorder,
        borderSide: BorderSide(
          color: InputTokens.borderFocused,
          width: AppBorderWidth.thick,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: AppRadius.inputBorder,
        borderSide: BorderSide(
          color: InputTokens.borderError,
          width: AppBorderWidth.thick,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: AppRadius.inputBorder,
        borderSide: BorderSide(
          color: InputTokens.borderError,
          width: AppBorderWidth.thick,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.componentPad,
        vertical: AppSpacing.space3,
      ),
      hintStyle: AppTextStyles.bodyMd.copyWith(
        color: AppColors.textPlaceholder,
      ),
      labelStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
      errorStyle: AppTextStyles.caption.copyWith(color: AppColors.statusError),
    ),

    // ── Chip ──
    chipTheme: ChipThemeData(
      backgroundColor: ChipTokens.unselectedBg,
      selectedColor: ChipTokens.selectedBg,
      labelStyle: AppTextStyles.bodySm.copyWith(
        color: ChipTokens.unselectedText,
      ),
      secondaryLabelStyle: AppTextStyles.bodySm.copyWith(
        color: ChipTokens.selectedText,
      ),
      side: BorderSide(
        color: ChipTokens.unselectedBorder,
        width: AppBorderWidth.thin,
      ),
      shape: const StadiumBorder(),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.space3,
        vertical: AppSpacing.space2,
      ),
    ),

    // ── Bottom Navigation Bar ──
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: NavTokens.barBg,
      selectedItemColor: NavTokens.activeColor,
      unselectedItemColor: NavTokens.inactiveColor,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: AppTextStyles.caption.copyWith(
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: AppTextStyles.caption,
    ),

    // ── Navigation Bar (Material 3) ──
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: NavTokens.barBg,
      indicatorColor: NavTokens.indicatorBg.withValues(alpha: 0.15),
      elevation: 0,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppTextStyles.caption.copyWith(
            color: NavTokens.activeColor,
            fontWeight: FontWeight.w600,
          );
        }
        return AppTextStyles.caption.copyWith(color: NavTokens.inactiveColor);
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return IconThemeData(color: NavTokens.activeColor, size: 24);
        }
        return IconThemeData(color: NavTokens.inactiveColor, size: 24);
      }),
    ),

    // ── Tab Bar ──
    tabBarTheme: TabBarThemeData(
      labelColor: AppColors.actionPrimary,
      unselectedLabelColor: AppColors.textSecondary,
      indicatorColor: AppColors.actionPrimary,
      indicatorSize: TabBarIndicatorSize.label,
      labelStyle: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w700),
      unselectedLabelStyle: AppTextStyles.bodyMd,
    ),

    // ── Switch ──
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.actionPrimary;
        }
        return AppColors.backgroundCard;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.actionPrimary.withValues(alpha: 0.3);
        }
        return AppColors.borderDefault;
      }),
    ),

    // ── Radio ──
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.actionPrimary;
        }
        return AppColors.textSecondary;
      }),
    ),

    // ── Checkbox ──
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return AppColors.actionPrimary;
        }
        return Colors.transparent;
      }),
      checkColor: WidgetStateProperty.all(AppColors.textOnPrimary),
      side: BorderSide(
        color: AppColors.borderDefault,
        width: AppBorderWidth.medium,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.xs),
      ),
    ),

    // ── Divider ──
    dividerTheme: DividerThemeData(
      color: SagePalette.sage200,
      thickness: 1,
      space: 0,
    ),

    // ── Bottom Sheet ──
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.backgroundCard,
      shape: RoundedRectangleBorder(borderRadius: AppRadius.sheetBorder),
      showDragHandle: true,
      dragHandleColor: SagePalette.sage300,
    ),

    // ── Dialog ──
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.backgroundCard,
      shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
      titleTextStyle: AppTextStyles.h3.copyWith(color: AppColors.textPrimary),
      contentTextStyle: AppTextStyles.bodyMd.copyWith(
        color: AppColors.textSecondary,
      ),
    ),

    // ── Floating Action Button ──
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.actionPrimary,
      foregroundColor: AppColors.textOnPrimary,
      elevation: 0,
      shape: StadiumBorder(),
    ),

    // ── Progress Indicator ──
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.actionPrimary,
      linearTrackColor: SagePalette.sage200,
      circularTrackColor: SagePalette.sage200,
    ),

    // ── Snackbar ──
    snackBarTheme: SnackBarThemeData(
      backgroundColor: NeutralPalette.neutral900,
      contentTextStyle: AppTextStyles.bodyMd.copyWith(
        color: AppColors.textOnDark,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

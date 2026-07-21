import 'dart:ui';

/// ═══════════════════════════════════════════════════════
/// Design Tokens — Colors
/// Kiến trúc DTCG 3 tầng: Primitive → Semantic → Component
/// Aesthetic: "Nature-Warm Playful"
/// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// TIER 1 — PRIMITIVE TOKENS
// Giá trị thô. KHÔNG dùng trực tiếp trong widget code.
// Chỉ được reference qua Semantic hoặc Component tokens.
// ───────────────────────────────────────────────────────

/// Bảng màu Sage — nền, border, muted elements
abstract final class SagePalette {
  static const Color sage100 = Color(0xFFEDF3EC);
  static const Color sage200 = Color(0xFFD6E8D4);
  static const Color sage300 = Color(0xFFB5C6B1);
  static const Color sage400 = Color(0xFF94A990);
  static const Color sage500 = Color(0xFF7A8A6E);
  static const Color sage600 = Color(0xFF5C6A52);
}

/// Bảng màu Amber — brand primary, CTA, highlights
abstract final class AmberPalette {
  static const Color amber100 = Color(0xFFFFF4D6);
  static const Color amber200 = Color(0xFFFFE4A0);
  static const Color amber300 = Color(0xFFF5C842);
  static const Color amber400 = Color(0xFFDDA92E); // ← Brand Primary
  static const Color amber500 = Color(0xFFC08920);
  static const Color amber600 = Color(0xFF9A6D14);
}

/// Bảng màu Olive — brand secondary, tags, links
abstract final class OlivePalette {
  static const Color olive100 = Color(0xFFEFF4DC);
  static const Color olive200 = Color(0xFFD4E0A8);
  static const Color olive300 = Color(0xFFBAC87A);
  static const Color olive400 = Color(0xFFA8B468); // ← Brand Secondary
  static const Color olive500 = Color(0xFF8A9450);
  static const Color olive600 = Color(0xFF6B7240);
}

/// Bảng màu Neutral — text, surface, dividers
abstract final class NeutralPalette {
  static const Color neutral0   = Color(0xFFFFFFFF);
  static const Color neutral50  = Color(0xFFF7F7F5); // ← Surface chính
  static const Color neutral100 = Color(0xFFEFEFED);
  static const Color neutral200 = Color(0xFFDDDDD9);
  static const Color neutral300 = Color(0xFFBCBCB6);
  static const Color neutral400 = Color(0xFF9A9A93);
  static const Color neutral500 = Color(0xFF6B6B64);
  static const Color neutral600 = Color(0xFF4A4A44);
  static const Color neutral900 = Color(0xFF2D3320); // ← Text chính (olive-dark)
}

/// Màu trạng thái — chỉ dùng cho error/success
abstract final class StatusPalette {
  static const Color red400   = Color(0xFFE53E3E);
  static const Color red500   = Color(0xFFC0392B);
  static const Color green400 = Color(0xFF38A169);
  static const Color green500 = Color(0xFF276749);
}

// ───────────────────────────────────────────────────────
// TIER 2 — SEMANTIC TOKENS
// Theo mục đích sử dụng. Dùng trong design specs.
// ───────────────────────────────────────────────────────

abstract final class AppColors {
  // ── Background ──
  /// Nền chính toàn app (#F7F7F5)
  static const Color backgroundPrimary    = NeutralPalette.neutral50;
  /// Nền phụ, section tinted nhẹ (#EDF3EC)
  static const Color backgroundSecondary  = SagePalette.sage100;
  /// Nền card (#FFFFFF)
  static const Color backgroundCard       = NeutralPalette.neutral0;
  /// Nền section tinted đậm (#B5C6B1)
  static const Color backgroundTinted     = SagePalette.sage300;
  /// Nền tint amber nhẹ cho highlights (#FFF4D6)
  static const Color backgroundAmberTint  = AmberPalette.amber100;
  /// Nền tint olive nhẹ cho info sections (#EFF4DC)
  static const Color backgroundOliveTint  = OlivePalette.olive100;

  // ── Action ──
  /// CTA chính — amber (#DDA92E)
  static const Color actionPrimary        = AmberPalette.amber400;
  /// CTA chính hover/pressed (#C08920)
  static const Color actionPrimaryHover   = AmberPalette.amber500;
  /// Action phụ — olive (#A8B468)
  static const Color actionSecondary      = OlivePalette.olive400;
  /// Action phụ hover/pressed (#8A9450)
  static const Color actionSecondaryHover = OlivePalette.olive500;
  /// Action disabled (#B5C6B1)
  static const Color actionDisabled       = SagePalette.sage300;

  // ── Text ──
  /// Text chính — near-black olive (#2D3320)
  static const Color textPrimary          = NeutralPalette.neutral900;
  /// Text phụ — muted (#7A8A6E)
  static const Color textSecondary        = SagePalette.sage500;
  /// Text placeholder (#94A990)
  static const Color textPlaceholder      = SagePalette.sage400;
  /// Text trên nền amber — dark cho contrast WCAG AA (#2D3320)
  static const Color textOnPrimary        = NeutralPalette.neutral900;
  /// Text trên nền tối (#FFFFFF)
  static const Color textOnDark           = NeutralPalette.neutral0;
  /// Text link (#A8B468)
  static const Color textLink             = OlivePalette.olive400;

  // ── Border ──
  /// Border mặc định (#B5C6B1)
  static const Color borderDefault        = SagePalette.sage300;
  /// Border focus state (#A8B468)
  static const Color borderFocus          = OlivePalette.olive400;
  /// Border error state (#C0392B)
  static const Color borderError          = StatusPalette.red500;
  /// Border card nhẹ (#DDDDD9)
  static const Color borderCard           = NeutralPalette.neutral200;

  // ── Status ──
  /// Thành công (#38A169)
  static const Color statusSuccess        = StatusPalette.green400;
  /// Cảnh báo (#DDA92E)
  static const Color statusWarning        = AmberPalette.amber400;
  /// Lỗi (#C0392B)
  static const Color statusError          = StatusPalette.red500;
  /// Thông tin (#A8B468)
  static const Color statusInfo           = OlivePalette.olive400;
}

// ───────────────────────────────────────────────────────
// TIER 3 — COMPONENT TOKENS
// Dùng trực tiếp trong widget code.
// ───────────────────────────────────────────────────────

/// Tokens cho AppButton widget
abstract final class ButtonTokens {
  // Primary (amber CTA)
  static const Color primaryBg       = AppColors.actionPrimary;
  static const Color primaryText     = AppColors.textOnPrimary;
  // Secondary (olive outlined)
  static const Color secondaryBorder = AppColors.actionSecondary;
  static const Color secondaryText   = AppColors.actionSecondary;
  // Disabled
  static const Color disabledBg      = AppColors.actionDisabled;
  static const Color disabledText    = AppColors.textPlaceholder;
}

/// Tokens cho Card widgets
abstract final class CardTokens {
  static const Color bg     = AppColors.backgroundCard;
  static const Color border = AppColors.borderCard;
}

/// Tokens cho Input (TextField) widgets
abstract final class InputTokens {
  static const Color bg            = AppColors.backgroundPrimary;
  static const Color borderDefault = AppColors.borderDefault;
  static const Color borderFocused = AppColors.borderFocus;
  static const Color borderError   = AppColors.borderError;
}

/// Tokens cho Chip/Tag widgets
/// ⚠ WCAG fix: selected text dùng dark (#2D3320) thay vì white
///   vì white trên olive (#A8B468) chỉ đạt 3.2:1 (cần 4.5:1)
abstract final class ChipTokens {
  static const Color selectedBg       = AppColors.actionSecondary;
  static const Color selectedText     = AppColors.textPrimary; // WCAG fix
  static const Color unselectedBg     = AppColors.backgroundPrimary;
  static const Color unselectedText   = AppColors.textSecondary;
  static const Color unselectedBorder = AppColors.borderDefault;
}

/// Tokens cho Bottom Navigation Bar
abstract final class NavTokens {
  static const Color barBg         = AppColors.backgroundCard;
  static const Color activeColor   = AppColors.actionPrimary;
  static const Color inactiveColor = AppColors.textSecondary;
  static const Color indicatorBg   = AppColors.actionPrimary;
}

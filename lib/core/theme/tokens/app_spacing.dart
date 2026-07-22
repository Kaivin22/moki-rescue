/// ═══════════════════════════════════════════════════════
/// Design Tokens — Spacing
/// Base unit: 4px
/// ═══════════════════════════════════════════════════════
library;

// ───────────────────────────────────────────────────────
// TIER 1 — PRIMITIVE SPACING
// Đơn vị cơ sở 4px, nhân lên theo bội số.
// ───────────────────────────────────────────────────────

abstract final class _SpacePrimitives {
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;
  static const double space16 = 64;
  static const double space20 = 80;
}

// ───────────────────────────────────────────────────────
// TIER 2 — SEMANTIC SPACING
// Dùng trong widget code.
// ───────────────────────────────────────────────────────

/// Spacing cho layout tổng thể (page padding, section gaps)
abstract final class AppSpacing {
  // ── Primitives (tiện truy cập khi cần giá trị cụ thể) ──
  static const double space1 = _SpacePrimitives.space1; // 4px
  static const double space2 = _SpacePrimitives.space2; // 8px
  static const double space3 = _SpacePrimitives.space3; // 12px
  static const double space4 = _SpacePrimitives.space4; // 16px
  static const double space5 = _SpacePrimitives.space5; // 20px
  static const double space6 = _SpacePrimitives.space6; // 24px
  static const double space8 = _SpacePrimitives.space8; // 32px
  static const double space10 = _SpacePrimitives.space10; // 40px
  static const double space12 = _SpacePrimitives.space12; // 48px
  static const double space16 = _SpacePrimitives.space16; // 64px
  static const double space20 = _SpacePrimitives.space20; // 80px

  // ── Layout semantic ──
  /// 8px — khoảng cách layout nhỏ nhất (icon gaps, inline items)
  static const double layoutXs = _SpacePrimitives.space2;

  /// 16px — padding tiêu chuẩn cho các section
  static const double layoutSm = _SpacePrimitives.space4;

  /// 24px — padding trang, khoảng cách giữa các section
  static const double layoutMd = _SpacePrimitives.space6;

  /// 32px — khoảng cách lớn giữa các group
  static const double layoutLg = _SpacePrimitives.space8;

  /// 48px — khoảng cách hero/section rất lớn
  static const double layoutXl = _SpacePrimitives.space12;

  // ── Component semantic ──
  /// 12px — gap giữa các element trong component (icon ↔ text)
  static const double componentGap = _SpacePrimitives.space3;

  /// 16px — padding bên trong component (card, tile)
  static const double componentPad = _SpacePrimitives.space4;
}

// ───────────────────────────────────────────────────────
// TIER 3 — COMPONENT SIZING TOKENS
// Kích thước cố định cho các component cụ thể.
// ───────────────────────────────────────────────────────

/// Kích thước chuẩn cho các component
abstract final class AppSizes {
  /// Chiều cao button chính (52px — WCAG 2.5.5 touch target)
  static const double buttonHeight = 52;

  /// Chiều cao input field (52px)
  static const double inputHeight = 52;

  /// Chiều cao chip/tag (36px)
  static const double chipHeight = 36;

  /// Kích thước indicator dot cho nav bar (6px)
  static const double navIndicatorSize = 6;

  /// Touch target tối thiểu (48px — WCAG 2.5.5)
  static const double minTouchTarget = 48;

  /// Kích thước avatar nhỏ (32px)
  static const double avatarSm = 32;

  /// Kích thước avatar trung bình (40px)
  static const double avatarMd = 40;

  /// Kích thước avatar lớn (80px)
  static const double avatarLg = 80;

  /// Kích thước avatar rất lớn (96px — profile edit)
  static const double avatarXl = 96;
}

import 'package:flutter/material.dart';

/// ═══════════════════════════════════════════════════════
/// Design Tokens — Borders & Radius
/// Cards "float" với soft edges, pill shapes cho buttons/chips
/// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// TIER 1 — PRIMITIVE RADIUS
// ───────────────────────────────────────────────────────

abstract final class _RadiusPrimitives {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 28;
  static const double full = 9999;
}

// ───────────────────────────────────────────────────────
// TIER 2 — SEMANTIC RADIUS
// Dùng trong widget code.
// ───────────────────────────────────────────────────────

/// Border radius theo mục đích component
abstract final class AppRadius {
  // ── Primitives (tiện truy cập trực tiếp) ──
  static const double xs = _RadiusPrimitives.xs; // 4px
  static const double sm = _RadiusPrimitives.sm; // 8px
  static const double md = _RadiusPrimitives.md; // 12px
  static const double lg = _RadiusPrimitives.lg; // 16px
  static const double xl = _RadiusPrimitives.xl; // 20px
  static const double xxl = _RadiusPrimitives.xxl; // 24px
  static const double xxxl = _RadiusPrimitives.xxxl; // 28px
  static const double full = _RadiusPrimitives.full; // 9999px (pill)

  // ── Component semantic ──
  /// Card radius (20px) — "float" style, soft edges
  static const double card = _RadiusPrimitives.xl;

  /// Button radius — full pill shape (StadiumBorder)
  static const double button = _RadiusPrimitives.full;

  /// Chip/tag radius — full pill shape
  static const double chip = _RadiusPrimitives.full;

  /// Input field radius (16px)
  static const double input = _RadiusPrimitives.lg;

  /// Bottom sheet — top corners only (28px)
  static const double sheet = _RadiusPrimitives.xxxl;

  /// Avatar — full circle
  static const double avatar = _RadiusPrimitives.full;

  /// Thumbnail radius (12px)
  static const double thumbnail = _RadiusPrimitives.md;

  // ── Tiện ích BorderRadius đã build sẵn ──
  static final BorderRadius cardBorder = BorderRadius.circular(card);
  static final BorderRadius buttonBorder = BorderRadius.circular(button);
  static final BorderRadius chipBorder = BorderRadius.circular(chip);
  static final BorderRadius inputBorder = BorderRadius.circular(input);
  static final BorderRadius thumbnailBorder = BorderRadius.circular(thumbnail);

  /// Border cho bottom sheet (chỉ bo 2 góc trên)
  static const BorderRadius sheetBorder = BorderRadius.only(
    topLeft: Radius.circular(28),
    topRight: Radius.circular(28),
  );

  /// Border cho nav bar (chỉ bo 2 góc trên)
  static const BorderRadius navBarBorder = BorderRadius.only(
    topLeft: Radius.circular(28),
    topRight: Radius.circular(28),
  );
}

/// Các border width chuẩn
abstract final class AppBorderWidth {
  /// Border card/input mặc định (1px)
  static const double thin = 1;

  /// Border focus/selected (1.5px)
  static const double medium = 1.5;

  /// Border focus input, error state (2px)
  static const double thick = 2;
}

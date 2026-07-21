import 'package:flutter/material.dart';

/// ═══════════════════════════════════════════════════════
/// Design Tokens — Shadows
/// Olive-tinted shadows cho aesthetic "Nature-Warm Playful"
/// Base color: rgba(45, 51, 32, opacity) — olive-dark family
/// ═══════════════════════════════════════════════════════

abstract final class AppShadows {
  /// Shadow nhẹ — search bar, small floating elements
  /// 0 1px 4px rgba(45,51,32,0.06)
  static const List<BoxShadow> sm = [
    BoxShadow(
      color: Color.fromRGBO(45, 51, 32, 0.06),
      offset: Offset(0, 1),
      blurRadius: 4,
    ),
  ];

  /// Shadow trung bình — card mặc định, nav bar
  /// 0 4px 16px rgba(45,51,32,0.08)
  static const List<BoxShadow> md = [
    BoxShadow(
      color: Color.fromRGBO(45, 51, 32, 0.08),
      offset: Offset(0, 4),
      blurRadius: 16,
    ),
  ];

  /// Shadow lớn — modal, bottom sheet, elevated card
  /// 0 8px 32px rgba(45,51,32,0.12)
  static const List<BoxShadow> lg = [
    BoxShadow(
      color: Color.fromRGBO(45, 51, 32, 0.12),
      offset: Offset(0, 8),
      blurRadius: 32,
    ),
  ];

  /// Shadow CTA glow — amber primary button
  /// 0 4px 16px rgba(221,169,46,0.30)
  static const List<BoxShadow> amber = [
    BoxShadow(
      color: Color.fromRGBO(221, 169, 46, 0.30),
      offset: Offset(0, 4),
      blurRadius: 16,
    ),
  ];

  /// Không có shadow
  static const List<BoxShadow> none = [];
}

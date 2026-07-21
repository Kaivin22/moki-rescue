import 'package:flutter/material.dart';

/// ═══════════════════════════════════════════════════════
/// Design Tokens — Typography
/// Font: Be Vietnam Pro (Google Fonts)
/// Tất cả text styles dùng color mặc định neutral.900
/// ═══════════════════════════════════════════════════════

/// Font family chính của app
const String kFontFamily = 'BeVietnamPro';

/// Primitive text styles — KHÔNG dùng trực tiếp,
/// dùng qua AppTextStyles semantic aliases bên dưới.
abstract final class _FontPrimitives {
  static const TextStyle display = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 40,
    fontWeight: FontWeight.w700, // Bold
    height: 1.2,
    letterSpacing: -0.5,
  );

  static const TextStyle h1 = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700, // Bold
    height: 1.25,
    letterSpacing: -0.3,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.33,
    letterSpacing: 0,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.4,
    letterSpacing: 0,
  );

  static const TextStyle h4 = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w500, // Medium
    height: 1.44,
    letterSpacing: 0,
  );

  static const TextStyle bodyLg = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    letterSpacing: 0,
  );

  static const TextStyle bodyMd = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.43,
    letterSpacing: 0,
  );

  static const TextStyle bodySm = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.46,
    letterSpacing: 0,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.33,
    letterSpacing: 0.2,
  );

  static const TextStyle label = TextStyle(
    fontFamily: kFontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w700, // Bold
    height: 1.45,
    letterSpacing: 0.5,
  );
}

/// Semantic text styles — dùng trong widget code.
/// Color mặc định: neutral.900 (#2D3320).
/// Override color qua .copyWith(color: ...) khi cần.
abstract final class AppTextStyles {
  /// 40sp Bold — số liệu lớn, hero text
  static const TextStyle display = _FontPrimitives.display;

  /// 32sp Bold — tiêu đề trang chính
  static const TextStyle h1 = _FontPrimitives.h1;

  /// 24sp SemiBold — tiêu đề section lớn
  static const TextStyle h2 = _FontPrimitives.h2;

  /// 20sp SemiBold — tiêu đề section phụ
  static const TextStyle h3 = _FontPrimitives.h3;

  /// 18sp Medium — tiêu đề nhỏ, form labels
  static const TextStyle h4 = _FontPrimitives.h4;

  /// 16sp Regular — body text chính
  static const TextStyle bodyLg = _FontPrimitives.bodyLg;

  /// 14sp Regular — body text phổ biến nhất
  static const TextStyle bodyMd = _FontPrimitives.bodyMd;

  /// 13sp Regular — body text nhỏ
  static const TextStyle bodySm = _FontPrimitives.bodySm;

  /// 12sp Regular — caption, timestamps, metadata
  static const TextStyle caption = _FontPrimitives.caption;

  /// 11sp Bold — label badges, status text
  static const TextStyle label = _FontPrimitives.label;
}

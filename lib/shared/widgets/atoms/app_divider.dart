import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// C-08: AppDivider
/// Variants: simple (1px sage.200) | text ("Hoặc" divider)
/// ═══════════════════════════════════════════════════════

/// Divider đơn giản — 1px sage.200
class AppDivider extends StatelessWidget {
  const AppDivider({
    super.key,
    this.height = 1,
    this.indent = 0,
    this.endIndent = 0,
  });

  final double height;
  final double indent;
  final double endIndent;

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: height,
      thickness: 1,
      indent: indent,
      endIndent: endIndent,
      color: SagePalette.sage200,
    );
  }
}

/// Divider với text ở giữa — "── Hoặc ──"
class AppTextDivider extends StatelessWidget {
  const AppTextDivider({
    super.key,
    this.text = 'hoặc',
  });

  /// Text hiển thị giữa 2 đường kẻ
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Đường kẻ trái
        const Expanded(
          child: Divider(
            thickness: 1,
            color: SagePalette.sage200,
          ),
        ),
        // Text ở giữa
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space4,
          ),
          child: Text(
            text,
            style: AppTextStyles.bodyMd.copyWith(
              color: NeutralPalette.neutral400,
            ),
          ),
        ),
        // Đường kẻ phải
        const Expanded(
          child: Divider(
            thickness: 1,
            color: SagePalette.sage200,
          ),
        ),
      ],
    );
  }
}

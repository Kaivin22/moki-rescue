import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-09: AccountDeleteConfirmDialog
/// AlertDialog với warning icon + confirm/cancel actions
/// ═══════════════════════════════════════════════════════

class AccountDeleteConfirmDialog extends StatelessWidget {
  const AccountDeleteConfirmDialog({super.key, required this.onConfirm});

  final VoidCallback onConfirm;

  /// Hiển thị dialog — tiện ích static
  static Future<bool?> show(BuildContext context) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AccountDeleteConfirmDialog(
        onConfirm: () => Navigator.of(context).pop(true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: AppColors.backgroundCard,
      icon: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: AmberPalette.amber100,
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.warning_amber_rounded,
          size: 32,
          color: AppColors.actionPrimary,
        ),
      ),
      title: Text(
        'Xóa tài khoản?',
        style: AppTextStyles.h3.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
        textAlign: TextAlign.center,
      ),
      content: Text(
        'Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn bao gồm lịch trình, đánh giá và thông tin cá nhân sẽ bị xóa vĩnh viễn.',
        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
        textAlign: TextAlign.center,
      ),
      actionsAlignment: MainAxisAlignment.spaceEvenly,
      actions: [
        // Hủy
        Expanded(
          child: TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.actionSecondary,
              minimumSize: const Size(0, 48),
            ),
            child: Text(
              'Hủy',
              style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ),

        const SizedBox(width: AppSpacing.space3),

        // Xóa (red)
        Expanded(
          child: ElevatedButton(
            onPressed: onConfirm,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.statusError,
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 48),
              shape: const StadiumBorder(),
              elevation: 0,
            ),
            child: Text(
              'Xóa tài khoản',
              style: AppTextStyles.bodyMd.copyWith(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

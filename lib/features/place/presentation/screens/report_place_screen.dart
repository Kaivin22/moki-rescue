import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-22: ReportPlaceScreen
/// RadioGroup reason + detail text + submit
/// ═══════════════════════════════════════════════════════

enum _ReportReason {
  wrongInfo('Thông tin sai/lỗi thời'),
  closed('Địa điểm đã đóng cửa'),
  inappropriate('Nội dung không phù hợp'),
  spam('Spam hoặc quảng cáo'),
  duplicate('Địa điểm trùng lặp'),
  other('Lý do khác');

  const _ReportReason(this.label);
  final String label;
}

class ReportPlaceScreen extends StatefulWidget {
  const ReportPlaceScreen({
    super.key,
    required this.placeId,
    required this.placeName,
  });

  final String placeId;
  final String placeName;

  @override
  State<ReportPlaceScreen> createState() => _ReportPlaceScreenState();
}

class _ReportPlaceScreenState extends State<ReportPlaceScreen> {
  _ReportReason? _selected;
  final _detailController = TextEditingController();
  bool _isSubmitting = false;

  bool get _canSubmit => _selected != null;

  @override
  void dispose() {
    _detailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      setState(() => _isSubmitting = false);
      // Show success snackbar then pop
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cảm ơn! Báo cáo của bạn đã được ghi nhận.',
            style: AppTextStyles.bodyMd.copyWith(color: Colors.white),
          ),
          backgroundColor: AppColors.statusSuccess,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.cardBorder,
          ),
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Báo cáo địa điểm',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.maybePop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Context ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.space4),
              decoration: BoxDecoration(
                color: SagePalette.sage100,
                borderRadius: AppRadius.cardBorder,
              ),
              child: Row(
                children: [
                  const Icon(Icons.place_rounded,
                      color: AppColors.actionSecondary, size: 20),
                  const SizedBox(width: AppSpacing.space2),
                  Expanded(
                    child: Text(
                      widget.placeName,
                      style: AppTextStyles.bodyMd.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            Text(
              'Lý do báo cáo *',
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.space3),

            // ── Reason options ──
            ..._ReportReason.values.map((reason) {
              final isSelected = _selected == reason;
              return InkWell(
                onTap: () => setState(() => _selected = reason),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  margin: const EdgeInsets.only(bottom: AppSpacing.space2),
                  padding: const EdgeInsets.all(AppSpacing.space4),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.actionPrimary.withValues(alpha: 0.08)
                        : AppColors.backgroundCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.actionPrimary
                          : AppColors.borderDefault,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          reason.label,
                          style: AppTextStyles.bodyMd.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      // Custom radio dot
                      SizedBox(
                        width: 22,
                        height: 22,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.actionPrimary
                                  : AppColors.borderDefault,
                              width: 2,
                            ),
                          ),
                          child: isSelected
                              ? Center(
                                  child: Container(
                                    width: 10,
                                    height: 10,
                                    decoration: const BoxDecoration(
                                      color: AppColors.actionPrimary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: AppSpacing.layoutSm),
            const AppDivider(),
            const SizedBox(height: AppSpacing.layoutSm),

            // ── Detail text (optional) ──
            Text(
              'Mô tả thêm (tùy chọn)',
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.space3),

            TextField(
              controller: _detailController,
              maxLines: 4,
              maxLength: 300,
              decoration: InputDecoration(
                hintText: 'Mô tả chi tiết vấn đề bạn gặp phải...',
                hintStyle: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textPlaceholder,
                ),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide:
                      BorderSide(color: AppColors.borderFocus, width: 1.5),
                ),
                contentPadding: const EdgeInsets.all(AppSpacing.space4),
              ),
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
            ),

            const SizedBox(height: AppSpacing.layoutXl),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.layoutMd,
            0,
            AppSpacing.layoutMd,
            AppSpacing.layoutSm,
          ),
          child: AppButton(
            label: _isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo',
            onPressed: _canSubmit && !_isSubmitting ? _submit : null,
            isLoading: _isSubmitting,
          ),
        ),
      ),
    );
  }
}

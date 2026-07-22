import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-55: FeedbackScreen
/// Rating stars + category + text area + submit
/// ═══════════════════════════════════════════════════════

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  int _rating = 0;
  String _category = '';
  final _feedbackController = TextEditingController();
  bool _isSubmitting = false;
  bool _isSubmitted = false;

  static const _categories = [
    (id: 'bug', label: '🐛 Báo lỗi'),
    (id: 'feature', label: '💡 Đề xuất tính năng'),
    (id: 'ui', label: '🎨 Giao diện'),
    (id: 'content', label: '📍 Nội dung địa điểm'),
    (id: 'other', label: '💬 Khác'),
  ];

  bool get _canSubmit =>
      _rating > 0 &&
      _category.isNotEmpty &&
      _feedbackController.text.trim().length >= 10;

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
      _isSubmitted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isSubmitted)
      return _SuccessView(onDone: () => Navigator.maybePop(context));

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Phản hồi & Đánh giá',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Overall rating ──
            Center(
              child: Column(
                children: [
                  Text(
                    'Bạn đánh giá ứng dụng như thế nào?',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (i) {
                      return GestureDetector(
                        onTap: () => setState(() => _rating = i + 1),
                        child: AnimatedScale(
                          duration: const Duration(milliseconds: 150),
                          scale: _rating >= i + 1 ? 1.2 : 1.0,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              _rating >= i + 1
                                  ? Icons.star_rounded
                                  : Icons.star_border_rounded,
                              size: 44,
                              color: _rating >= i + 1
                                  ? AmberPalette.amber400
                                  : AppColors.textPlaceholder,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  if (_rating > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.space2),
                      child: Text(
                        [
                          '',
                          'Rất tệ',
                          'Tệ',
                          'Bình thường',
                          'Tốt',
                          'Xuất sắc',
                        ][_rating],
                        style: AppTextStyles.bodyMd.copyWith(
                          color: AppColors.actionPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Category ──
            Text(
              'Chủ đề phản hồi',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: AppSpacing.space3),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _categories.map((c) {
                final isSelected = _category == c.id;
                return GestureDetector(
                  onTap: () => setState(() => _category = c.id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space3,
                      vertical: AppSpacing.space2,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.actionPrimary.withValues(alpha: 0.12)
                          : AppColors.backgroundSecondary,
                      borderRadius: AppRadius.chipBorder,
                      border: Border.all(
                        color: isSelected
                            ? AppColors.actionPrimary
                            : AppColors.borderDefault,
                        width: isSelected ? 1.5 : 1,
                      ),
                    ),
                    child: Text(
                      c.label,
                      style: AppTextStyles.bodySm.copyWith(
                        color: isSelected
                            ? AppColors.actionPrimary
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Text area ──
            Text(
              'Mô tả chi tiết',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: AppSpacing.space3),
            TextField(
              controller: _feedbackController,
              maxLines: 6,
              maxLength: 500,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText:
                    'Hãy chia sẻ trải nghiệm của bạn hoặc mô tả lỗi gặp phải...',
                hintStyle: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textPlaceholder,
                ),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.cardBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppRadius.cardBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppRadius.cardBorder,
                  borderSide: BorderSide(
                    color: AppColors.borderFocus,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.all(AppSpacing.space3),
                counterStyle: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Attach screenshot hint ──
            Row(
              children: [
                Icon(
                  Icons.attach_file_rounded,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: AppSpacing.space1),
                Text(
                  'Đính kèm ảnh chụp màn hình',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.actionPrimary,
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.layoutLg),

            AppButton(
              label: _isSubmitting ? 'Đang gửi...' : '📤 Gửi phản hồi',
              isLoading: _isSubmitting,
              onPressed: _canSubmit ? _submit : null,
            ),

            const SizedBox(height: AppSpacing.space3),

            Center(
              child: Text(
                'Phản hồi của bạn giúp chúng tôi cải thiện ứng dụng tốt hơn mỗi ngày 💚',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.onDone});
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.backgroundPrimary,
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.layoutXl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.statusSuccess.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('✅', style: TextStyle(fontSize: 48)),
              ),
            ),
            const SizedBox(height: AppSpacing.layoutMd),
            Text(
              'Cảm ơn bạn!',
              style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.space3),
            Text(
              'Phản hồi của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.',
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.layoutLg),
            AppButton(label: 'Về trang chủ', onPressed: onDone),
          ],
        ),
      ),
    ),
  );
}

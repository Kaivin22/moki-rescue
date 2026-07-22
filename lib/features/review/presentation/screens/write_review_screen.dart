import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';
import '../providers/review_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-21: WriteReviewScreen
/// Star tap selector + companion chips + text field +
/// highlight multi-select + image attach + submit
/// ═══════════════════════════════════════════════════════

class WriteReviewScreen extends ConsumerStatefulWidget {
  const WriteReviewScreen({
    super.key,
    required this.placeId,
    required this.placeName,
  });

  final String placeId;
  final String placeName;

  @override
  ConsumerState<WriteReviewScreen> createState() => _WriteReviewScreenState();
}

class _WriteReviewScreenState extends ConsumerState<WriteReviewScreen> {
  int _rating = 0;
  String? _companion;
  final Set<String> _highlights = {};
  final _textController = TextEditingController();
  bool isSubmitting = false;
  bool _hasPhotos = false;

  static const _companions = ['Một mình', 'Cặp đôi', 'Gia đình', 'Nhóm bạn'];

  static const _highlightOptions = [
    ('🌊', 'Phong cảnh'),
    ('🍜', 'Ẩm thực'),
    ('😊', 'Nhân viên'),
    ('💰', 'Giá cả'),
    ('🧹', 'Vệ sinh'),
    ('🚗', 'Di chuyển'),
    ('📸', 'Chụp ảnh'),
    ('🎉', 'Vui vẻ'),
  ];

  static const _ratingLabels = [
    '',
    'Tệ',
    'Tạm ổn',
    'Bình thường',
    'Tốt',
    'Tuyệt vời!',
  ];

  bool get _canSubmit =>
      _rating > 0 && _textController.text.trim().length >= 20;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    await ref
        .read(writeReviewProvider.notifier)
        .submit(
          placeId: widget.placeId,
          rating: _rating,
          content: _textController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<WriteReviewState>(writeReviewProvider, (prev, next) {
      if (!mounted) return;
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.statusError,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      if (next.success) {
        ref.read(writeReviewProvider.notifier).reset();
        Navigator.pop(context, true);
      }
    });

    final writeState = ref.watch(writeReviewProvider);
    final isSubmitting = writeState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Viết đánh giá',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.maybePop(context),
        ),
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Place name ──
            Text(
              widget.placeName,
              style: AppTextStyles.h3.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),
            const AppDivider(),
            const SizedBox(height: AppSpacing.layoutSm),

            // ── Star selector ──
            _SectionLabel('Đánh giá của bạn *'),
            const SizedBox(height: AppSpacing.space3),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                return GestureDetector(
                  onTap: () => setState(() => _rating = star),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(
                      star <= _rating
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: AppColors.actionPrimary,
                      size: 44,
                    ),
                  ),
                );
              }),
            ),

            if (_rating > 0) ...[
              const SizedBox(height: AppSpacing.space2),
              Center(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Text(
                    _ratingLabels[_rating],
                    key: ValueKey(_rating),
                    style: AppTextStyles.h4.copyWith(
                      color: AppColors.actionPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Companion ──
            _SectionLabel('Đi cùng ai?'),
            const SizedBox(height: AppSpacing.space3),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _companions
                  .map(
                    (c) => TagChip(
                      label: c,
                      isSelected: _companion == c,
                      variant: TagChipVariant.filter,
                      onTap: () => setState(
                        () => _companion = _companion == c ? null : c,
                      ),
                    ),
                  )
                  .toList(),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Highlights ──
            _SectionLabel('Điểm nổi bật'),
            const SizedBox(height: AppSpacing.space3),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _highlightOptions.map((h) {
                final (emoji, label) = h;
                return TagChip(
                  label: '$emoji $label',
                  isSelected: _highlights.contains(label),
                  variant: TagChipVariant.filter,
                  onTap: () => setState(() {
                    _highlights.contains(label)
                        ? _highlights.remove(label)
                        : _highlights.add(label);
                  }),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Review text ──
            _SectionLabel('Nội dung đánh giá *'),
            const SizedBox(height: AppSpacing.space3),

            TextField(
              controller: _textController,
              maxLines: 5,
              maxLength: 500,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText:
                    'Chia sẻ trải nghiệm thực tế của bạn (tối thiểu 20 ký tự)...',
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
                  borderSide: BorderSide(
                    color: AppColors.borderFocus,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.all(AppSpacing.space4),
              ),
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Add photos ──
            InkWell(
              onTap: () => setState(() => _hasPhotos = !_hasPhotos),
              borderRadius: AppRadius.cardBorder,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.space4),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: AppRadius.cardBorder,
                  border: Border.all(
                    color: AppColors.borderDefault,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.add_photo_alternate_outlined,
                      color: _hasPhotos
                          ? AppColors.actionPrimary
                          : AppColors.textSecondary,
                      size: 24,
                    ),
                    const SizedBox(width: AppSpacing.space2),
                    Text(
                      _hasPhotos ? '1 ảnh đã chọn' : 'Thêm ảnh (tùy chọn)',
                      style: AppTextStyles.bodyMd.copyWith(
                        color: _hasPhotos
                            ? AppColors.actionPrimary
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.layoutXl),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.layoutMd,
            0,
            AppSpacing.layoutMd,
            AppSpacing.layoutSm,
          ),
          child: AppButton(
            label: isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá',
            onPressed: _canSubmit && !isSubmitting ? _submit : null,
            isLoading: isSubmitting,
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppTextStyles.h4.copyWith(
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
  );
}

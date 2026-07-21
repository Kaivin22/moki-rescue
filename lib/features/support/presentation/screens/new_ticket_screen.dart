import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/support_providers.dart';

/// SCREEN-NEW-TICKET: Tạo yêu cầu hỗ trợ mới
class NewTicketScreen extends ConsumerStatefulWidget {
  const NewTicketScreen({super.key});

  @override
  ConsumerState<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends ConsumerState<NewTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _selectedCategory = 'other';

  static const _categories = [
    (id: 'bug', label: '🐛 Lỗi kỹ thuật'),
    (id: 'payment', label: '💳 Thanh toán'),
    (id: 'account', label: '👤 Tài khoản'),
    (id: 'feature', label: '💡 Góp ý tính năng'),
    (id: 'other', label: '📝 Khác'),
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(createTicketProvider.notifier).submit(
          title: _titleController.text.trim(),
          description: _descController.text.trim(),
          category: _selectedCategory,
        );

    final state = ref.read(createTicketProvider);
    if (state.success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Đã gửi yêu cầu thành công!')),
      );
      Navigator.maybePop(context);
    } else if (state.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(state.error!),
          backgroundColor: AppColors.statusError,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createTicketProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Tạo yêu cầu hỗ trợ',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Category ──
              Text('Loại yêu cầu',
                  style: AppTextStyles.h4
                      .copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.space3),
              Wrap(
                spacing: AppSpacing.space2,
                runSpacing: AppSpacing.space2,
                children: _categories.map((c) {
                  final isSelected = _selectedCategory == c.id;
                  return GestureDetector(
                    onTap: () =>
                        setState(() => _selectedCategory = c.id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.actionPrimary
                                .withValues(alpha: 0.1)
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
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: AppSpacing.layoutMd),

              // ── Title ──
              Text('Tiêu đề',
                  style: AppTextStyles.h4
                      .copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.space2),
              TextFormField(
                controller: _titleController,
                maxLength: 100,
                decoration: InputDecoration(
                  hintText: 'Mô tả ngắn vấn đề của bạn',
                  hintStyle: AppTextStyles.bodyMd
                      .copyWith(color: AppColors.textPlaceholder),
                  filled: true,
                  fillColor: AppColors.backgroundSecondary,
                  border: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide:
                          BorderSide(color: AppColors.borderDefault)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide:
                          BorderSide(color: AppColors.borderDefault)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide: BorderSide(
                          color: AppColors.borderFocus, width: 1.5)),
                  counterStyle: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Vui lòng nhập tiêu đề';
                  }
                  if (v.trim().length < 5) {
                    return 'Tiêu đề quá ngắn';
                  }
                  return null;
                },
              ),

              const SizedBox(height: AppSpacing.layoutSm),

              // ── Description ──
              Text('Mô tả chi tiết',
                  style: AppTextStyles.h4
                      .copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.space2),
              TextFormField(
                controller: _descController,
                maxLines: 6,
                maxLength: 1000,
                decoration: InputDecoration(
                  hintText: 'Mô tả chi tiết vấn đề, bao gồm các bước tái hiện lỗi (nếu có)...',
                  hintStyle: AppTextStyles.bodyMd
                      .copyWith(color: AppColors.textPlaceholder),
                  filled: true,
                  fillColor: AppColors.backgroundSecondary,
                  border: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide:
                          BorderSide(color: AppColors.borderDefault)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide:
                          BorderSide(color: AppColors.borderDefault)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: AppRadius.inputBorder,
                      borderSide: BorderSide(
                          color: AppColors.borderFocus, width: 1.5)),
                  counterStyle: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                  alignLabelWithHint: true,
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Vui lòng mô tả chi tiết';
                  }
                  if (v.trim().length < 20) {
                    return 'Mô tả quá ngắn (tối thiểu 20 ký tự)';
                  }
                  return null;
                },
              ),

              const SizedBox(height: AppSpacing.layoutXl),

              AppButton(
                label: state.isLoading ? 'Đang gửi...' : 'Gửi yêu cầu',
                onPressed: state.isLoading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

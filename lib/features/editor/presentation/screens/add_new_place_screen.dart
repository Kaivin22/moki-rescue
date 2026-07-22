import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// SCREEN-ADD-NEW-PLACE: Form thêm địa điểm mới
class AddNewPlaceScreen extends ConsumerStatefulWidget {
  const AddNewPlaceScreen({super.key});

  @override
  ConsumerState<AddNewPlaceScreen> createState() => _AddNewPlaceScreenState();
}

class _AddNewPlaceScreenState extends ConsumerState<AddNewPlaceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();
  String _category = 'beach';
  bool _isLoading = false;

  static const _categories = [
    (id: 'beach', label: '🏖 Biển'),
    (id: 'food', label: '🍜 Ẩm thực'),
    (id: 'historical', label: '🏮 Lịch sử'),
    (id: 'nature', label: '🌿 Thiên nhiên'),
    (id: 'viewpoint', label: '🌅 Ngắm cảnh'),
    (id: 'hotel', label: '🏨 Lưu trú'),
    (id: 'shopping', label: '🛍 Mua sắm'),
    (id: 'entertainment', label: '🎭 Giải trí'),
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _addressCtrl.dispose();
    _imageCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.backgroundPrimary,
    appBar: AppBar(
      title: Text(
        'Thêm địa điểm mới',
        style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
      ),
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
            // ── Header ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.statusSuccess.withValues(alpha: 0.08),
                borderRadius: AppRadius.cardBorder,
                border: Border.all(
                  color: AppColors.statusSuccess.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  const Text('📍', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: AppSpacing.space2),
                  Expanded(
                    child: Text(
                      'Điền đầy đủ thông tin để thêm địa điểm mới vào hệ thống.',
                      style: AppTextStyles.bodySm.copyWith(
                        color: AppColors.statusSuccess,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            _Label('Tên địa điểm *'),
            const SizedBox(height: AppSpacing.space2),
            _Field(
              controller: _nameCtrl,
              hint: 'VD: Bán đảo Sơn Trà',
              validator: (v) => (v == null || v.isEmpty) ? 'Bắt buộc' : null,
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            _Label('Mô tả'),
            const SizedBox(height: AppSpacing.space2),
            _Field(
              controller: _descCtrl,
              hint: 'Mô tả về địa điểm...',
              maxLines: 4,
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            _Label('Địa chỉ *'),
            const SizedBox(height: AppSpacing.space2),
            _Field(
              controller: _addressCtrl,
              hint: 'VD: Sơn Trà, Đà Nẵng',
              validator: (v) => (v == null || v.isEmpty) ? 'Bắt buộc' : null,
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            _Label('Danh mục *'),
            const SizedBox(height: AppSpacing.space2),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _categories.map((cat) {
                final isSelected = _category == cat.id;
                return ChoiceChip(
                  label: Text(
                    cat.label,
                    style: AppTextStyles.caption.copyWith(
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.actionPrimary,
                  backgroundColor: AppColors.backgroundSecondary,
                  onSelected: (_) => setState(() => _category = cat.id),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.inputBorder,
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Lat/Lng ──
            _Label('Tọa độ (tùy chọn)'),
            const SizedBox(height: AppSpacing.space2),
            Row(
              children: [
                Expanded(
                  child: _Field(
                    controller: _latCtrl,
                    hint: 'Vĩ độ (lat)',
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: AppSpacing.space3),
                Expanded(
                  child: _Field(
                    controller: _lngCtrl,
                    hint: 'Kinh độ (lng)',
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            _Label('URL hình ảnh'),
            const SizedBox(height: AppSpacing.space2),
            _Field(
              controller: _imageCtrl,
              hint: 'https://example.com/image.jpg',
            ),

            const SizedBox(height: AppSpacing.layoutXl),

            AppButton(
              label: _isLoading ? 'Đang tạo...' : '➕ Tạo địa điểm',
              onPressed: _isLoading ? null : () => _submit(context),
            ),

            const SizedBox(height: AppSpacing.layoutMd),
          ],
        ),
      ),
    ),
  );

  Future<void> _submit(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    try {
      final data = {
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'category': _category,
        'thumbnail_url': _imageCtrl.text.trim().isEmpty
            ? null
            : _imageCtrl.text.trim(),
        if (_latCtrl.text.isNotEmpty && _lngCtrl.text.isNotEmpty) ...{
          'latitude': double.tryParse(_latCtrl.text),
          'longitude': double.tryParse(_lngCtrl.text),
        },
        'rating_avg': 0.0,
        'rating_count': 0,
        'created_at': DateTime.now().toIso8601String(),
      };

      await Supabase.instance.client.from('places').insert(data);

      messenger.showSnackBar(
        const SnackBar(content: Text('✅ Đã thêm địa điểm thành công!')),
      );
      nav.maybePop();
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Lỗi: $e'),
          backgroundColor: AppColors.statusError,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
  );
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType,
    this.validator,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    maxLines: maxLines,
    validator: validator,
    keyboardType: keyboardType,
    style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
    decoration: InputDecoration(
      hintText: hint,
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
        borderSide: BorderSide(color: AppColors.borderFocus, width: 1.5),
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/molecules/loading_shimmer.dart';
import '../../../place/presentation/providers/place_providers.dart';
import '../../../place/data/datasources/supabase_place_datasource.dart';

/// SCREEN-EDITOR-EDIT-PLACE: Editor chỉnh sửa địa điểm
class EditorEditPlaceScreen extends ConsumerStatefulWidget {
  const EditorEditPlaceScreen({super.key, required this.placeId});

  final String placeId;

  @override
  ConsumerState<EditorEditPlaceScreen> createState() =>
      _EditorEditPlaceScreenState();
}

class _EditorEditPlaceScreenState
    extends ConsumerState<EditorEditPlaceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  String _category = 'beach';
  bool _isLoading = false;
  bool _initialized = false;

  static const _categories = [
    'beach', 'food', 'historical', 'nature',
    'viewpoint', 'hotel', 'shopping', 'entertainment',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _addressCtrl.dispose();
    _imageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final placeAsync = ref.watch(placeDetailProvider(widget.placeId));

    return placeAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Đang tải...')),
        body: const LoadingShimmerList(
            variant: ShimmerVariant.listTile, itemCount: 6),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Lỗi')),
        body: Center(child: Text('$e')),
      ),
      data: (place) {
        if (!_initialized) {
          _nameCtrl.text = place.name;
          _descCtrl.text = place.description ?? '';
          _addressCtrl.text = place.address;
          _imageCtrl.text = place.thumbnailUrl ?? '';
          _category = place.category;
          _initialized = true;
        }

        return Scaffold(
          backgroundColor: AppColors.backgroundPrimary,
          appBar: AppBar(
            title: Text('Chỉnh sửa địa điểm',
                style: AppTextStyles.h4
                    .copyWith(fontWeight: FontWeight.w700)),
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
                  _PreviewCard(place.name, place.address, place.thumbnailUrl),
                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Tên địa điểm *'),
                  const SizedBox(height: AppSpacing.space2),
                  _FormField(
                      controller: _nameCtrl,
                      hint: 'VD: Bãi biển Mỹ Khê',
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Bắt buộc' : null),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Mô tả chi tiết'),
                  const SizedBox(height: AppSpacing.space2),
                  _FormField(
                    controller: _descCtrl,
                    hint: 'Mô tả thêm về địa điểm...',
                    maxLines: 4,
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Địa chỉ *'),
                  const SizedBox(height: AppSpacing.space2),
                  _FormField(
                      controller: _addressCtrl,
                      hint: 'VD: Sơn Trà, Đà Nẵng',
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Bắt buộc' : null),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('URL hình ảnh'),
                  const SizedBox(height: AppSpacing.space2),
                  _FormField(
                      controller: _imageCtrl,
                      hint: 'https://example.com/image.jpg'),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Danh mục'),
                  const SizedBox(height: AppSpacing.space2),
                  DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(
                          borderRadius: AppRadius.inputBorder,
                          borderSide: BorderSide(
                              color: AppColors.borderDefault)),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: AppRadius.inputBorder,
                          borderSide: BorderSide(
                              color: AppColors.borderDefault)),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: AppRadius.inputBorder,
                          borderSide: BorderSide(
                              color: AppColors.borderFocus,
                              width: 1.5)),
                    ),
                    items: _categories
                        .map((c) => DropdownMenuItem(
                            value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _category = v ?? _category),
                    style: AppTextStyles.bodyMd
                        .copyWith(color: AppColors.textPrimary),
                  ),

                  const SizedBox(height: AppSpacing.layoutXl),

                  AppButton(
                    label: _isLoading ? 'Đang lưu...' : '💾 Lưu thay đổi',
                    onPressed: _isLoading ? null : () => _save(context),
                  ),

                  const SizedBox(height: AppSpacing.layoutMd),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _save(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    try {
      final ds = SupabasePlaceDataSource();
      await ds.updatePlace(
        placeId: widget.placeId,
        data: {
          'name': _nameCtrl.text.trim(),
          'description': _descCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
          'thumbnail_url': _imageCtrl.text.trim(),
          'category': _category,
        },
      );
      messenger.showSnackBar(
        const SnackBar(content: Text('✅ Đã cập nhật thành công!')),
      );
      nav.maybePop();
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
            content: Text('Lỗi: $e'),
            backgroundColor: AppColors.statusError),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard(this.name, this.address, this.imageUrl);
  final String name;
  final String address;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(AppSpacing.space3),
        decoration: BoxDecoration(
          color: AppColors.backgroundCard,
          borderRadius: AppRadius.cardBorder,
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Row(
          children: [
            if (imageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(imageUrl!,
                    width: 48, height: 48, fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stk) => const SizedBox(width: 48)),
              ),
            const SizedBox(width: AppSpacing.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Đang sửa:',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                  Text(name,
                      style: AppTextStyles.bodyMd
                          .copyWith(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  Text(address,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(text,
      style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600));
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.validator,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        maxLines: maxLines,
        validator: validator,
        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: AppTextStyles.bodyMd
              .copyWith(color: AppColors.textPlaceholder),
          filled: true,
          fillColor: AppColors.backgroundSecondary,
          border: OutlineInputBorder(
              borderRadius: AppRadius.inputBorder,
              borderSide: BorderSide(color: AppColors.borderDefault)),
          enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputBorder,
              borderSide: BorderSide(color: AppColors.borderDefault)),
          focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.inputBorder,
              borderSide:
                  BorderSide(color: AppColors.borderFocus, width: 1.5)),
        ),
      );
}

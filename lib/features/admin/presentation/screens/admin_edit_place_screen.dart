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

/// SCREEN-ADMIN-EDIT-PLACE + SCREEN-EDITOR-EDIT-PLACE
/// Form edit địa điểm — dùng chung cho admin + editor
class AdminEditPlaceScreen extends ConsumerStatefulWidget {
  const AdminEditPlaceScreen({super.key, required this.placeId});

  final String placeId;

  @override
  ConsumerState<AdminEditPlaceScreen> createState() =>
      _AdminEditPlaceScreenState();
}

class _AdminEditPlaceScreenState extends ConsumerState<AdminEditPlaceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  String _category = 'beach';
  bool _isLoading = false;
  bool _initialized = false;

  static const _categories = [
    'beach',
    'food',
    'historical',
    'nature',
    'viewpoint',
    'hotel',
    'shopping',
    'entertainment',
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
          variant: ShimmerVariant.listTile,
          itemCount: 6,
        ),
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
            title: Text(
              'Sửa địa điểm',
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
                  _FieldLabel('Tên địa điểm *'),
                  const SizedBox(height: AppSpacing.space2),
                  _TextField(
                    controller: _nameCtrl,
                    hint: 'VD: Bãi biển Mỹ Khê',
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Bắt buộc' : null,
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Mô tả'),
                  const SizedBox(height: AppSpacing.space2),
                  _TextField(
                    controller: _descCtrl,
                    hint: 'Mô tả về địa điểm...',
                    maxLines: 4,
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('Địa chỉ *'),
                  const SizedBox(height: AppSpacing.space2),
                  _TextField(
                    controller: _addressCtrl,
                    hint: 'VD: Sơn Trà, Đà Nẵng',
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Bắt buộc' : null,
                  ),

                  const SizedBox(height: AppSpacing.layoutSm),

                  _FieldLabel('URL hình ảnh'),
                  const SizedBox(height: AppSpacing.space2),
                  _TextField(controller: _imageCtrl, hint: 'https://...'),

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
                    ),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _category = v ?? _category),
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: AppSpacing.layoutXl),

                  AppButton(
                    label: _isLoading ? 'Đang lưu...' : 'Lưu thay đổi',
                    onPressed: _isLoading ? null : () => _save(context),
                  ),
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
        const SnackBar(content: Text('✅ Đã cập nhật địa điểm!')),
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

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppTextStyles.bodyMd.copyWith(fontWeight: FontWeight.w600),
  );
}

class _TextField extends StatelessWidget {
  const _TextField({
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

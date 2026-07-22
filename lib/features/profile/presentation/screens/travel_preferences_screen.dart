import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../providers/profile_providers.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

/// SCREEN-TRAVEL-PREFS: Tùy chỉnh phong cách du lịch
class TravelPreferencesScreen extends ConsumerStatefulWidget {
  const TravelPreferencesScreen({super.key});

  @override
  ConsumerState<TravelPreferencesScreen> createState() =>
      _TravelPreferencesScreenState();
}

class _TravelPreferencesScreenState
    extends ConsumerState<TravelPreferencesScreen> {
  String? _travelWith;
  List<String> _travelStyle = [];
  bool _initialized = false;

  // Phương tiện di chuyển (map to travelStyle tags)
  static const _travelWithOptions = [
    (id: 'solo', label: '🧍 Một mình'),
    (id: 'couple', label: '💑 Cặp đôi'),
    (id: 'family', label: '👨‍👩‍👧 Gia đình'),
    (id: 'group', label: '👫 Nhóm bạn'),
  ];

  static const _styles = [
    'Ẩm thực',
    'Thiên nhiên',
    'Văn hóa',
    'Phiêu lưu',
    'Nghỉ dưỡng',
    'Chụp ảnh',
    'Mua sắm',
    'Lịch sử',
    'Tiết kiệm',
    'Sang trọng',
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final profile = ref.read(currentProfileProvider);
      if (profile != null) {
        _travelWith = profile.travelWith;
        _travelStyle = List.from(profile.travelStyle ?? []);
      }
      _initialized = true;
    }
  }

  Future<void> _save() async {
    await ref
        .read(editProfileProvider.notifier)
        .updateProfile(travelWith: _travelWith, travelStyle: _travelStyle);

    final state = ref.read(editProfileProvider);
    if (state.success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Đã lưu sở thích du lịch!')),
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
    final state = ref.watch(editProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Sở thích du lịch',
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
            // ── Đi với ai ──
            _Label('Bạn thường đi du lịch với'),
            const SizedBox(height: AppSpacing.space3),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _travelWithOptions.map((tw) {
                final isSelected = _travelWith == tw.id;
                return TagChip(
                  label: tw.label,
                  isSelected: isSelected,
                  variant: TagChipVariant.filter,
                  onTap: () => setState(() => _travelWith = tw.id),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Phong cách (multi-select) ──
            _Label('Phong cách du lịch (chọn nhiều)'),
            const SizedBox(height: AppSpacing.space3),
            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _styles.map((s) {
                final isSelected = _travelStyle.contains(s);
                return TagChip(
                  label: s,
                  isSelected: isSelected,
                  variant: TagChipVariant.filter,
                  onTap: () => setState(() {
                    if (isSelected) {
                      _travelStyle.remove(s);
                    } else {
                      _travelStyle.add(s);
                    }
                  }),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutXl),

            AppButton(
              label: state.isLoading ? 'Đang lưu...' : 'Lưu sở thích',
              onPressed: state.isLoading ? null : _save,
            ),

            const SizedBox(height: AppSpacing.layoutMd),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600));
}

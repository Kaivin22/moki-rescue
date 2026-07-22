import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_text_field.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-07: ProfileSetupScreen
/// Avatar + form fields + travel style chips (multi-select)
/// LinearProgressIndicator amber top
/// ═══════════════════════════════════════════════════════

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  final _cityController = TextEditingController(text: 'Đà Nẵng');
  final _bioController = TextEditingController();

  final Set<String> _selectedStyles = {};

  static const _travelStyles = [
    '🏖 Biển & nghỉ dưỡng',
    '🏛 Văn hóa & lịch sử',
    '🍜 Ẩm thực',
    '🏞 Thiên nhiên',
    '📸 Nhiếp ảnh',
    '🛍 Mua sắm',
    '🎭 Giải trí',
    '🧘 Relax',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _cityController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: const Text('Hoàn thiện hồ sơ'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: 0.6,
            backgroundColor: SagePalette.sage200,
            valueColor: const AlwaysStoppedAnimation<Color>(
              AppColors.actionPrimary,
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Avatar section ──
            Center(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Avatar circle 96px
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: SagePalette.sage200,
                    child: Icon(
                      Icons.person_rounded,
                      size: 48,
                      color: SagePalette.sage400,
                    ),
                  ),

                  // Camera FAB bottom-right 32px
                  Positioned(
                    bottom: -4,
                    right: -4,
                    child: GestureDetector(
                      onTap: () {
                        // TODO: image picker
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.actionPrimary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.backgroundCard,
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          size: 16,
                          color: AppColors.textOnPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // Tên hiển thị
            AppTextField(
              label: 'Tên hiển thị',
              hint: 'Nhập tên của bạn',
              controller: _nameController,
              textInputAction: TextInputAction.next,
              prefixIcon: const Icon(
                Icons.badge_outlined,
                color: AppColors.textSecondary,
                size: 20,
              ),
            ),

            const SizedBox(height: AppSpacing.space3),

            // Thành phố
            AppTextField(
              label: 'Thành phố thường trú',
              hint: 'Đà Nẵng',
              controller: _cityController,
              textInputAction: TextInputAction.next,
              prefixIcon: const Icon(
                Icons.home_outlined,
                color: AppColors.textSecondary,
                size: 20,
              ),
            ),

            const SizedBox(height: AppSpacing.space3),

            // Bio
            AppTextField(
              label: 'Giới thiệu ngắn',
              hint: 'Tôi thích khám phá...',
              controller: _bioController,
              maxLines: 2,
              maxLength: 100,
              textInputAction: TextInputAction.done,
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // Travel style section
            Text(
              'Phong cách du lịch của bạn',
              style: AppTextStyles.h4.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.space3),

            Wrap(
              spacing: AppSpacing.space2,
              runSpacing: AppSpacing.space2,
              children: _travelStyles.map((style) {
                final isSelected = _selectedStyles.contains(style);
                return TagChip(
                  label: style,
                  isSelected: isSelected,
                  variant: TagChipVariant.filter,
                  onTap: () => setState(() {
                    isSelected
                        ? _selectedStyles.remove(style)
                        : _selectedStyles.add(style);
                  }),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            AppButton(
              label: 'Bắt đầu khám phá →',
              onPressed: () {
                context.go(AppRoutes.home);
              },
            ),

            const SizedBox(height: AppSpacing.space3),

            AppButton(
              label: 'Bỏ qua, làm sau',
              variant: AppButtonVariant.text,
              onPressed: () {
                context.go(AppRoutes.home);
              },
            ),
          ],
        ),
      ),
    );
  }
}

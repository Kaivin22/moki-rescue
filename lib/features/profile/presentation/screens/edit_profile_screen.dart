import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../providers/profile_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-36: EditProfileScreen
/// Avatar pick + form fields: name, bio, username, social links
/// ═══════════════════════════════════════════════════════

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _usernameController;
  late final TextEditingController _bioController;
  late final TextEditingController _websiteController;
  bool _hasChanges = false;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final profile = ref.read(currentProfileProvider);
      _nameController = TextEditingController(text: profile?.displayName ?? '');
      _usernameController = TextEditingController();
      _bioController = TextEditingController(text: profile?.bio ?? '');
      _websiteController = TextEditingController();
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    _websiteController.dispose();
    super.dispose();
  }

  void _markChanged() => setState(() => _hasChanges = true);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Chỉnh sửa hồ sơ',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          if (_hasChanges)
            TextButton(
              onPressed: _saveProfile,
              child: Text(
                'Lưu',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.actionPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          children: [
            // ── Cover photo ──
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Cover
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    height: 120,
                    width: double.infinity,
                    color: SagePalette.sage300,
                    child: CachedNetworkImage(
                      imageUrl: 'https://picsum.photos/seed/cover/400/200',
                      fit: BoxFit.cover,
                      placeholder: (_, _) =>
                          Container(color: SagePalette.sage200),
                      errorWidget: (_, _, _) =>
                          Container(color: SagePalette.sage300),
                    ),
                  ),
                ),
                Positioned(
                  right: AppSpacing.space3,
                  bottom: AppSpacing.space3,
                  child: _EditBadge(onTap: () {}),
                ),
                // Avatar
                Positioned(
                  left: AppSpacing.layoutSm,
                  bottom: -40,
                  child: Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.backgroundCard,
                            width: 3,
                          ),
                        ),
                        child: CircleAvatar(
                          radius: 40,
                          backgroundColor: SagePalette.sage200,
                          backgroundImage: const CachedNetworkImageProvider(
                            'https://picsum.photos/seed/avatar/200/200',
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: _EditBadge(onTap: () {}, small: true),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 56),

            // ── Form ──
            Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _FormField(
                    label: 'Tên hiển thị *',
                    controller: _nameController,
                    hint: 'Nhập tên của bạn',
                    onChanged: (_) => _markChanged(),
                    maxLength: 50,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  _FormField(
                    label: 'Username',
                    controller: _usernameController,
                    hint: 'ten_nguoi_dung',
                    prefix: '@',
                    onChanged: (_) => _markChanged(),
                    maxLength: 30,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  _FormField(
                    label: 'Giới thiệu',
                    controller: _bioController,
                    hint: 'Nói gì đó về bạn...',
                    maxLines: 4,
                    onChanged: (_) => _markChanged(),
                    maxLength: 150,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  _FormField(
                    label: 'Website / Blog',
                    controller: _websiteController,
                    hint: 'https://',
                    onChanged: (_) => _markChanged(),
                    keyboardType: TextInputType.url,
                  ),

                  const SizedBox(height: AppSpacing.layoutMd),

                  // ── Social links section ──
                  Text(
                    'Mạng xã hội',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  _SocialTile(
                    icon: Icons.facebook_rounded,
                    label: 'Facebook',
                    onTap: () {},
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  _SocialTile(
                    icon: Icons.camera_alt_outlined,
                    label: 'Instagram',
                    onTap: () {},
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  _SocialTile(
                    icon: Icons.tiktok,
                    label: 'TikTok',
                    onTap: () {},
                  ),

                  const SizedBox(height: AppSpacing.layoutXl),

                  AppButton(
                    label: 'Lưu thay đổi',
                    onPressed: _hasChanges ? _saveProfile : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveProfile() async {
    await ref
        .read(editProfileProvider.notifier)
        .updateProfile(
          displayName: _nameController.text.trim(),
          bio: _bioController.text.trim(),
        );
    final state = ref.read(editProfileProvider);
    if (state.success && mounted) {
      setState(() => _hasChanges = false);
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
}

class _EditBadge extends StatelessWidget {
  const _EditBadge({required this.onTap, this.small = false});
  final VoidCallback onTap;
  final bool small;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: small ? 26 : 32,
      height: small ? 26 : 32,
      decoration: BoxDecoration(
        color: AppColors.actionPrimary,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Icon(
        Icons.camera_alt_rounded,
        color: Colors.white,
        size: small ? 12 : 16,
      ),
    ),
  );
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.label,
    required this.controller,
    required this.hint,
    this.prefix,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    required this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final String? prefix;
  final int maxLines;
  final int? maxLength;
  final TextInputType? keyboardType;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: AppTextStyles.bodySm.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
      const SizedBox(height: AppSpacing.space2),
      TextField(
        controller: controller,
        onChanged: onChanged,
        maxLines: maxLines,
        maxLength: maxLength,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: AppTextStyles.bodyMd.copyWith(
            color: AppColors.textPlaceholder,
          ),
          prefixText: prefix,
          prefixStyle: AppTextStyles.bodyMd.copyWith(
            color: AppColors.textSecondary,
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.space4,
            vertical: AppSpacing.space3,
          ),
          counterStyle: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
      ),
    ],
  );
}

class _SocialTile extends StatelessWidget {
  const _SocialTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: AppRadius.cardBorder,
    child: Container(
      padding: const EdgeInsets.all(AppSpacing.space3),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.space3),
          Expanded(child: Text(label, style: AppTextStyles.bodyMd)),
          const Icon(
            Icons.add_rounded,
            color: AppColors.textSecondary,
            size: 20,
          ),
        ],
      ),
    ),
  );
}

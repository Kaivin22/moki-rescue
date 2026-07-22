import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-33: SettingsScreen
/// Grouped settings: Tài khoản | Hiển thị | Thông báo |
/// Về ứng dụng — với toggle switches và navigation tiles
/// ═══════════════════════════════════════════════════════

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  // Notification toggles
  bool _pushNotifs = true;
  bool _emailNotifs = false;
  bool _tripReminders = true;
  bool _communityUpdates = true;
  // Display
  bool _darkMode = false;
  bool _compactView = false;
  String _language = 'Tiếng Việt';
  String _unit = 'km';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundSecondary,
      appBar: AppBar(
        title: Text(
          'Cài đặt',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        children: [
          // ═════ Tài khoản ═════
          _SectionHeader('Tài khoản'),
          _GroupCard(
            children: [
              _NavTile(
                icon: Icons.person_outlined,
                label: 'Thông tin cá nhân',
                onTap: () => context.push(AppRoutes.editProfile),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.lock_outlined,
                label: 'Đổi mật khẩu',
                onTap: () => context.push(AppRoutes.forgotPassword),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.link_rounded,
                label: 'Tài khoản liên kết',
                trailing: 'Google',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('🔗 Đã kết nối với Google')),
                  );
                },
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.verified_user_outlined,
                label: 'Xác minh danh tính',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✅ Tài khoản đã xác minh')),
                  );
                },
              ),
            ],
          ),

          // ═════ Hiển thị ═════
          _SectionHeader('Hiển thị'),
          _GroupCard(
            children: [
              _ToggleTile(
                icon: Icons.dark_mode_outlined,
                label: 'Chế độ tối',
                value: _darkMode,
                onChanged: (v) => setState(() => _darkMode = v),
              ),
              const AppDivider(),
              _ToggleTile(
                icon: Icons.view_compact_outlined,
                label: 'Giao diện thu gọn',
                value: _compactView,
                onChanged: (v) => setState(() => _compactView = v),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.language_rounded,
                label: 'Ngôn ngữ',
                trailing: _language,
                onTap: () => _showLanguagePicker(),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.straighten_rounded,
                label: 'Đơn vị khoảng cách',
                trailing: _unit,
                onTap: () =>
                    setState(() => _unit = _unit == 'km' ? 'mi' : 'km'),
              ),
            ],
          ),

          // ═════ Thông báo ═════
          _SectionHeader('Thông báo'),
          _GroupCard(
            children: [
              _ToggleTile(
                icon: Icons.notifications_outlined,
                label: 'Thông báo đẩy',
                value: _pushNotifs,
                onChanged: (v) => setState(() => _pushNotifs = v),
              ),
              const AppDivider(),
              _ToggleTile(
                icon: Icons.email_outlined,
                label: 'Thông báo email',
                value: _emailNotifs,
                onChanged: (v) => setState(() => _emailNotifs = v),
              ),
              const AppDivider(),
              _ToggleTile(
                icon: Icons.alarm_rounded,
                label: 'Nhắc nhở chuyến đi',
                value: _tripReminders,
                onChanged: (v) => setState(() => _tripReminders = v),
              ),
              const AppDivider(),
              _ToggleTile(
                icon: Icons.people_outlined,
                label: 'Cập nhật cộng đồng',
                value: _communityUpdates,
                onChanged: (v) => setState(() => _communityUpdates = v),
              ),
            ],
          ),

          // ═════ Bộ nhớ & Dữ liệu ═════
          _SectionHeader('Bộ nhớ & Dữ liệu'),
          _GroupCard(
            children: [
              _NavTile(
                icon: Icons.storage_rounded,
                label: 'Bộ nhớ đệm',
                trailing: '24 MB',
                onTap: () => _clearCache(context),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.download_rounded,
                label: 'Nội dung offline',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        '💾 Dữ liệu bản đồ & địa điểm đã sẵn sàng offline',
                      ),
                    ),
                  );
                },
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.cloud_download_outlined,
                label: 'Xuất dữ liệu của tôi',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('📦 Đã tải file dữ liệu cá nhân (JSON)'),
                    ),
                  );
                },
              ),
            ],
          ),

          // ═════ Về ứng dụng ═════
          _SectionHeader('Về ứng dụng'),
          _GroupCard(
            children: [
              _NavTile(
                icon: Icons.info_outline_rounded,
                label: 'Phiên bản',
                trailing: '1.0.0',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('ℹ️ DaNang Itinerary Planner v1.0.0'),
                    ),
                  );
                },
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.description_outlined,
                label: 'Điều khoản sử dụng',
                onTap: () => context.push(AppRoutes.termsOfService),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.privacy_tip_outlined,
                label: 'Chính sách bảo mật',
                onTap: () => context.push(AppRoutes.privacyPolicy),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.star_outline_rounded,
                label: 'Đánh giá ứng dụng',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('⭐ Cảm ơn bạn đã đánh giá 5 sao!'),
                    ),
                  );
                },
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.bug_report_outlined,
                label: 'Báo cáo lỗi',
                onTap: () => context.push(AppRoutes.feedback),
              ),
            ],
          ),

          // ═════ Vùng nguy hiểm ═════
          _SectionHeader('Vùng nguy hiểm'),
          _GroupCard(
            children: [
              _NavTile(
                icon: Icons.logout_rounded,
                label: 'Đăng xuất',
                isDestructive: true,
                onTap: () => _confirmLogout(context),
              ),
              const AppDivider(),
              _NavTile(
                icon: Icons.delete_outline_rounded,
                label: 'Xoá tài khoản',
                isDestructive: true,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        '⚠️ Vui lòng liên hệ support@danang.app để xóa tài khoản',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.layoutXl),
        ],
      ),
    );
  }

  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.backgroundCard,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.sheetBorder),
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: AppSpacing.space3),
          Text(
            'Chọn ngôn ngữ',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.space3),
          ...['Tiếng Việt', 'English', '日本語'].map(
            (lang) => ListTile(
              title: Text(lang, style: AppTextStyles.bodyMd),
              trailing: _language == lang
                  ? Icon(Icons.check_rounded, color: AppColors.actionPrimary)
                  : null,
              onTap: () {
                setState(() => _language = lang);
                Navigator.pop(context);
              },
            ),
          ),
          const SizedBox(height: AppSpacing.space3),
        ],
      ),
    );
  }

  void _clearCache(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          'Xoá bộ nhớ đệm',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        content: Text(
          'Bạn có chắc muốn xoá 24 MB bộ nhớ đệm?',
          style: AppTextStyles.bodyMd,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Xoá', style: TextStyle(color: AppColors.statusError)),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final router = GoRouter.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          'Đăng xuất',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        content: Text(
          'Bạn có chắc muốn đăng xuất?',
          style: AppTextStyles.bodyMd,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Đăng xuất',
              style: TextStyle(color: AppColors.statusError),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authNotifierProvider.notifier).signOut();
      router.go(AppRoutes.login);
    }
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      AppSpacing.layoutMd,
      AppSpacing.layoutSm,
      AppSpacing.layoutMd,
      AppSpacing.space2,
    ),
    child: Text(
      title.toUpperCase(),
      style: AppTextStyles.caption.copyWith(
        color: AppColors.textSecondary,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
      ),
    ),
  );
}

class _GroupCard extends StatelessWidget {
  const _GroupCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
    decoration: BoxDecoration(
      color: AppColors.backgroundCard,
      borderRadius: AppRadius.cardBorder,
      border: Border.all(color: AppColors.borderDefault),
    ),
    child: Column(children: children),
  );
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.isDestructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool isDestructive;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: AppRadius.cardBorder,
    child: Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.layoutSm,
        vertical: AppSpacing.space4,
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: isDestructive
                ? AppColors.statusError
                : AppColors.textSecondary,
          ),
          const SizedBox(width: AppSpacing.space3),
          Expanded(
            child: Text(
              label,
              style: AppTextStyles.bodyMd.copyWith(
                color: isDestructive
                    ? AppColors.statusError
                    : AppColors.textPrimary,
              ),
            ),
          ),
          if (trailing != null) ...[
            Text(
              trailing!,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: AppSpacing.space1),
          ],
          Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textSecondary,
            size: 18,
          ),
        ],
      ),
    ),
  );
}

class _ToggleTile extends StatelessWidget {
  const _ToggleTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(
      horizontal: AppSpacing.layoutSm,
      vertical: AppSpacing.space3,
    ),
    child: Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.space3),
        Expanded(
          child: Text(
            label,
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.actionPrimary,
        ),
      ],
    ),
  );
}

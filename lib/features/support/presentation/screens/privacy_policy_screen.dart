import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-56: PrivacyPolicyScreen
/// Văn bản chính sách với TOC anchor navigation
/// ═══════════════════════════════════════════════════════

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  static const _sections = [
    _PolicySection(
      id: 1,
      title: '1. Thông tin chúng tôi thu thập',
      content:
          'Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký tài khoản (tên, email, ảnh đại diện), '
          'thông tin thiết bị (hệ điều hành, phiên bản ứng dụng), dữ liệu sử dụng (lịch trình tạo, địa điểm xem), '
          'và vị trí gần đúng (nếu bạn cho phép) để gợi ý địa điểm gần bạn.',
    ),
    _PolicySection(
      id: 2,
      title: '2. Cách chúng tôi sử dụng thông tin',
      content:
          'Thông tin được dùng để: cá nhân hóa trải nghiệm, cải thiện tính năng AI, hiển thị nội dung phù hợp, '
          'gửi thông báo liên quan đến chuyến đi, và phân tích để nâng cao chất lượng dịch vụ. '
          'Chúng tôi KHÔNG bán thông tin cá nhân của bạn cho bên thứ ba.',
    ),
    _PolicySection(
      id: 3,
      title: '3. Chia sẻ thông tin',
      content:
          'Chúng tôi chỉ chia sẻ thông tin với: nhà cung cấp dịch vụ đám mây (lưu trữ an toàn), '
          'đối tác phân tích (dữ liệu ẩn danh), và cơ quan pháp luật (khi có yêu cầu hợp pháp). '
          'Nội dung công khai (lịch trình, đánh giá) bạn chọn chia sẻ sẽ hiển thị cho người dùng khác.',
    ),
    _PolicySection(
      id: 4,
      title: '4. Bảo mật dữ liệu',
      content:
          'Chúng tôi áp dụng mã hóa SSL/TLS cho mọi truyền tải dữ liệu, lưu trữ mật khẩu bằng bcrypt, '
          'và tuân thủ tiêu chuẩn OWASP. Bạn có thể kích hoạt xác thực 2 lớp trong Cài đặt bảo mật.',
    ),
    _PolicySection(
      id: 5,
      title: '5. Quyền của bạn',
      content:
          'Bạn có quyền: truy cập và xuất dữ liệu cá nhân, chỉnh sửa thông tin không chính xác, '
          'xóa tài khoản và tất cả dữ liệu liên quan, rút lại sự đồng ý chia sẻ vị trí bất kỳ lúc nào. '
          'Liên hệ privacy@danangapp.vn để thực hiện các quyền này.',
    ),
    _PolicySection(
      id: 6,
      title: '6. Cookie và Tracking',
      content:
          'Ứng dụng sử dụng local storage để lưu tùy chọn người dùng và session. '
          'Phân tích ẩn danh dùng Firebase Analytics với IP anonymization. '
          'Bạn có thể tắt tracking trong Cài đặt → Bảo mật.',
    ),
    _PolicySection(
      id: 7,
      title: '7. Thay đổi chính sách',
      content:
          'Chúng tôi có thể cập nhật chính sách này định kỳ. Thay đổi quan trọng sẽ được thông báo '
          'qua email và thông báo trong ứng dụng ít nhất 30 ngày trước khi có hiệu lực.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Chính sách bảo mật',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        children: [
          // ── Header ──
          Container(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: AppRadius.cardBorder,
              border: Border.all(color: AppColors.borderDefault),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.privacy_tip_outlined,
                  color: AppColors.actionPrimary,
                  size: 24,
                ),
                const SizedBox(width: AppSpacing.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cập nhật lần cuối: 01/07/2025',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        'Có hiệu lực từ ngày 01/07/2025',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.layoutMd),

          Text(
            'Chúng tôi coi trọng quyền riêng tư của bạn. Chính sách này giải thích cách DaNang Itinerary '
            'thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.',
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.textSecondary,
              height: 1.6,
            ),
          ),

          const SizedBox(height: AppSpacing.layoutMd),
          const AppDivider(),
          const SizedBox(height: AppSpacing.layoutMd),

          // ── Sections ──
          ..._sections.map((s) => _SectionBlock(section: s)),

          const AppDivider(),
          const SizedBox(height: AppSpacing.layoutMd),

          // ── Contact ──
          Text(
            'Liên hệ về quyền riêng tư',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.space3),
          Text(
            'Email: privacy@danangapp.vn\n'
            'Địa chỉ: 123 Trần Phú, Hải Châu, Đà Nẵng\n'
            'Giờ làm việc: 8:00 – 17:00, Thứ 2 – Thứ 6',
            style: AppTextStyles.bodyMd.copyWith(
              color: AppColors.textSecondary,
              height: 1.6,
            ),
          ),

          const SizedBox(height: AppSpacing.layoutLg),
          AppButton(
            label: '📧 Liên hệ về bảo mật',
            variant: AppButtonVariant.secondary,
            onPressed: () {},
          ),
          const SizedBox(height: AppSpacing.layoutXl),
        ],
      ),
    );
  }
}

class _PolicySection {
  const _PolicySection({
    required this.id,
    required this.title,
    required this.content,
  });
  final int id;
  final String title;
  final String content;
}

class _SectionBlock extends StatelessWidget {
  const _SectionBlock({required this.section});
  final _PolicySection section;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.layoutMd),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          section.title,
          style: AppTextStyles.h4.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.actionPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.space3),
        Text(
          section.content,
          style: AppTextStyles.bodyMd.copyWith(
            color: AppColors.textPrimary,
            height: 1.6,
          ),
        ),
      ],
    ),
  );
}

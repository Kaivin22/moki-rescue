import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../../../shared/widgets/atoms/app_divider.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-57: TermsOfServiceScreen
/// Điều khoản sử dụng với accordion sections
/// ═══════════════════════════════════════════════════════

class TermsOfServiceScreen extends StatefulWidget {
  const TermsOfServiceScreen({super.key});

  @override
  State<TermsOfServiceScreen> createState() => _TermsOfServiceScreenState();
}

class _TermsOfServiceScreenState extends State<TermsOfServiceScreen> {
  final Set<int> _expanded = {0}; // first one open by default
  bool _accepted = false;

  static const _terms = [
    _Term(
      title: '1. Chấp thuận điều khoản',
      content:
          'Bằng cách sử dụng ứng dụng DaNang Itinerary, bạn đồng ý bị ràng buộc bởi các Điều khoản Dịch vụ này. '
          'Nếu bạn không đồng ý, vui lòng không sử dụng ứng dụng. '
          'Chúng tôi có quyền cập nhật điều khoản này bất cứ lúc nào với thông báo hợp lý.',
    ),
    _Term(
      title: '2. Tài khoản người dùng',
      content:
          'Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu. '
          'Cấm chia sẻ tài khoản, tạo nhiều tài khoản cho cùng một người, hoặc sử dụng tài khoản người khác. '
          'Báo cáo ngay nếu phát hiện truy cập trái phép vào tài khoản của bạn.',
    ),
    _Term(
      title: '3. Nội dung người dùng',
      content:
          'Bạn giữ quyền sở hữu nội dung đăng tải (đánh giá, ảnh, lịch trình). '
          'Bằng cách đăng tải, bạn cấp cho chúng tôi quyền sử dụng miễn phí để hiển thị và phân phối. '
          'Nghiêm cấm: nội dung sai lệch, vi phạm bản quyền, ngôn ngữ thù địch, spam.',
    ),
    _Term(
      title: '4. Hành vi bị cấm',
      content:
          'Người dùng không được: cào dữ liệu, reverse engineer, phá vỡ hệ thống bảo mật, '
          'sử dụng bot tự động, đăng nội dung quảng cáo không được phép, '
          'hoặc sử dụng ứng dụng cho mục đích thương mại mà không có thỏa thuận.',
    ),
    _Term(
      title: '5. Quyền sở hữu trí tuệ',
      content:
          'Toàn bộ nội dung gốc của ứng dụng (logo, giao diện, code, văn bản giới thiệu địa điểm) '
          'là tài sản của DaNang Itinerary. Không được sao chép, phân phối mà không được phép. '
          'Dữ liệu địa điểm được cấp phép từ các nguồn bên thứ ba tương ứng.',
    ),
    _Term(
      title: '6. Miễn trừ trách nhiệm',
      content:
          'Ứng dụng cung cấp thông tin du lịch "như hiện tại". Chúng tôi không đảm bảo tính chính xác tuyệt đối. '
          'Không chịu trách nhiệm về thiệt hại phát sinh từ việc tin tưởng thông tin trong ứng dụng. '
          'Luôn xác minh thông tin quan trọng với nguồn chính thức trước khi đi.',
    ),
    _Term(
      title: '7. Chấm dứt dịch vụ',
      content:
          'Chúng tôi có quyền tạm khóa hoặc xóa tài khoản vi phạm điều khoản. '
          'Bạn có thể xóa tài khoản bất kỳ lúc nào trong Cài đặt. '
          'Khi chấm dứt, mọi quyền sử dụng dịch vụ sẽ chấm dứt ngay lập tức.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Điều khoản sử dụng',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              children: [
                // ── Header info ──
                Container(
                  padding: const EdgeInsets.all(AppSpacing.space3),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: AppRadius.cardBorder,
                    border: Border.all(color: AppColors.borderDefault),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.description_outlined,
                        color: AppColors.actionPrimary,
                      ),
                      const SizedBox(width: AppSpacing.space3),
                      Expanded(
                        child: Text(
                          'Có hiệu lực từ: 01/07/2025 · Phiên bản 1.0',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutSm),

                Text(
                  'Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ.',
                  style: AppTextStyles.bodyMd.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutSm),

                // ── Terms accordion ──
                ..._terms.asMap().entries.map((entry) {
                  final i = entry.key;
                  final term = entry.value;
                  final isExpanded = _expanded.contains(i);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundCard,
                        borderRadius: AppRadius.cardBorder,
                        border: Border.all(
                          color: isExpanded
                              ? AppColors.actionPrimary
                              : AppColors.borderDefault,
                        ),
                      ),
                      child: InkWell(
                        onTap: () => setState(() {
                          if (isExpanded) {
                            _expanded.remove(i);
                          } else {
                            _expanded.add(i);
                          }
                        }),
                        borderRadius: AppRadius.cardBorder,
                        child: Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(AppSpacing.space3),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      term.title,
                                      style: AppTextStyles.bodyMd.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: isExpanded
                                            ? AppColors.actionPrimary
                                            : AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  AnimatedRotation(
                                    turns: isExpanded ? 0.5 : 0,
                                    duration: const Duration(milliseconds: 200),
                                    child: const Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      size: 20,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (isExpanded)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.space3,
                                  0,
                                  AppSpacing.space3,
                                  AppSpacing.space3,
                                ),
                                child: Text(
                                  term.content,
                                  style: AppTextStyles.bodyMd.copyWith(
                                    color: AppColors.textSecondary,
                                    height: 1.6,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),

                const AppDivider(),
                const SizedBox(height: AppSpacing.layoutSm),

                // ── Accept checkbox ──
                GestureDetector(
                  onTap: () => setState(() => _accepted = !_accepted),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _accepted,
                        onChanged: (v) =>
                            setState(() => _accepted = v ?? false),
                        activeColor: AppColors.actionPrimary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            'Tôi đã đọc và đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật',
                            style: AppTextStyles.bodyMd.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.layoutSm),
                AppButton(
                  label: 'Đồng ý và Tiếp tục',
                  onPressed: _accepted
                      ? () => Navigator.maybePop(context)
                      : null,
                ),
                const SizedBox(height: AppSpacing.layoutXl),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Term {
  const _Term({required this.title, required this.content});
  final String title;
  final String content;
}

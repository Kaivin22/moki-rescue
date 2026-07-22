import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-54: HelpCenterScreen
/// FAQ accordion + search + Contact support CTA
/// ═══════════════════════════════════════════════════════

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  final _searchController = TextEditingController();
  final Set<int> _expanded = {};

  static const _categories = [
    (emoji: '🗺', label: 'Lịch trình'),
    (emoji: '📍', label: 'Địa điểm'),
    (emoji: '👤', label: 'Tài khoản'),
    (emoji: '💳', label: 'Thanh toán'),
    (emoji: '🔔', label: 'Thông báo'),
    (emoji: '🔒', label: 'Bảo mật'),
  ];

  static const _faqs = [
    _FaqItem(
      question: 'Làm sao để tạo lịch trình mới?',
      answer:
          'Vào tab "Lịch trình" → nhấn nút "+" → chọn điểm đến, ngày bắt đầu/kết thúc → thêm địa điểm vào từng ngày bằng cách kéo thả hoặc tìm kiếm.',
    ),
    _FaqItem(
      question: 'Tôi có thể chia sẻ lịch trình không?',
      answer:
          'Có! Mở lịch trình bất kỳ → nhấn nút Chia sẻ (📤) → chọn chia sẻ qua link, QR code hoặc mạng xã hội. Người nhận có thể xem và sao chép lịch trình của bạn.',
    ),
    _FaqItem(
      question: 'Cách thêm địa điểm vào danh sách yêu thích?',
      answer:
          'Nhấn biểu tượng 🔖 trên bất kỳ thẻ địa điểm nào để lưu vào danh sách. Xem lại trong Hồ sơ → Đã lưu.',
    ),
    _FaqItem(
      question: 'AI du lịch có thể làm gì?',
      answer:
          'AI có thể: gợi ý địa điểm phù hợp sở thích, tạo lịch trình tự động, trả lời câu hỏi về thời tiết, ẩm thực, văn hóa địa phương, và ước tính ngân sách chuyến đi.',
    ),
    _FaqItem(
      question: 'Làm thế nào để xoá tài khoản?',
      answer:
          'Vào Cài đặt → Vùng nguy hiểm → Xoá tài khoản. Lưu ý: mọi dữ liệu sẽ bị xoá vĩnh viễn sau 30 ngày. Bạn có thể huỷ yêu cầu trong thời gian này.',
    ),
    _FaqItem(
      question: 'Ứng dụng có hoạt động offline không?',
      answer:
          'Một số tính năng hoạt động offline: xem lịch trình đã tải, bản đồ đã cache, danh sách yêu thích. Tính năng AI Chat, tìm kiếm và cập nhật dữ liệu cần kết nối internet.',
    ),
    _FaqItem(
      question: 'Sao tôi không nhận được thông báo?',
      answer:
          'Kiểm tra: 1) Cài đặt → Thông báo → bật Thông báo đẩy. 2) Cài đặt điện thoại → Ứng dụng → cho phép thông báo. 3) Kiểm tra không bị chặn trong chế độ Không làm phiền.',
    ),
  ];

  List<_FaqItem> get _filtered {
    final q = _searchController.text.toLowerCase();
    if (q.isEmpty) return _faqs;
    return _faqs
        .where(
          (f) =>
              f.question.toLowerCase().contains(q) ||
              f.answer.toLowerCase().contains(q),
        )
        .toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Trung tâm trợ giúp',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: CustomScrollView(
        slivers: [
          // ── Hero banner ──
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(AppSpacing.layoutSm),
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.actionPrimary, AppColors.actionSecondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadius.cardBorder,
              ),
              child: Column(
                children: [
                  const Text('❓', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: AppSpacing.space2),
                  Text(
                    'Chúng tôi có thể\ngiúp gì cho bạn?',
                    style: AppTextStyles.h3.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  // Search
                  TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Tìm kiếm câu hỏi...',
                      hintStyle: AppTextStyles.bodyMd.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        color: AppColors.textSecondary,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: AppRadius.inputBorder,
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.space3,
                        vertical: 12,
                      ),
                    ),
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Category chips ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chủ đề',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  Wrap(
                    spacing: AppSpacing.space2,
                    runSpacing: AppSpacing.space2,
                    children: _categories
                        .map(
                          (c) => ActionChip(
                            label: Text('${c.emoji} ${c.label}'),
                            labelStyle: AppTextStyles.caption.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w500,
                            ),
                            backgroundColor: AppColors.backgroundSecondary,
                            side: BorderSide(color: AppColors.borderDefault),
                            onPressed: () {
                              _searchController.text = c.label;
                              setState(() {});
                            },
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  Text(
                    'Câu hỏi thường gặp',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space2),
                ],
              ),
            ),
          ),

          // ── FAQ accordion ──
          SliverPadding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.layoutSm,
            ),
            sliver: SliverList.builder(
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final faq = filtered[i];
                final isExpanded = _expanded.contains(i);
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(bottom: AppSpacing.space2),
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
                                  faq.question,
                                  style: AppTextStyles.bodyMd.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              AnimatedRotation(
                                duration: const Duration(milliseconds: 200),
                                turns: isExpanded ? 0.5 : 0,
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
                              faq.answer,
                              style: AppTextStyles.bodyMd.copyWith(
                                color: AppColors.textSecondary,
                                height: 1.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Contact support ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              child: Column(
                children: [
                  Text(
                    'Không tìm thấy câu trả lời?',
                    style: AppTextStyles.h4.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space2),
                  Text(
                    'Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp bạn.',
                    style: AppTextStyles.bodyMd.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.layoutSm),
                  AppButton(
                    label: '💬 Chat với hỗ trợ',
                    onPressed: () => context.push(AppRoutes.newTicket),
                  ),
                  const SizedBox(height: AppSpacing.space3),
                  AppButton(
                    label: '📧 Gửi email hỗ trợ',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.push(AppRoutes.feedback),
                  ),
                  const SizedBox(height: AppSpacing.layoutXl),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqItem {
  const _FaqItem({required this.question, required this.answer});
  final String question;
  final String answer;
}

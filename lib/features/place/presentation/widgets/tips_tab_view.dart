import 'package:flutter/material.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/tag_chip.dart';
import '../../../../shared/widgets/molecules/empty_state.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-20: TipsTabView (embedded trong PlaceDetailScreen Tab 2)
/// Accordion nhóm mẹo: Thời điểm | Di chuyển | Ăn uống | Lưu ý
/// ═══════════════════════════════════════════════════════

class TipsTabView extends StatefulWidget {
  const TipsTabView({super.key, this.placeId});
  final String? placeId;

  @override
  State<TipsTabView> createState() => _TipsTabViewState();
}

class _TipsTabViewState extends State<TipsTabView> {
  final Set<int> _expandedSections = {0}; // Section 0 open by default

  static const _sections = [
    _TipSection(
      icon: Icons.schedule_rounded,
      title: 'Thời điểm lý tưởng',
      color: AppColors.actionPrimary,
      tips: [
        _TipItem(
          text: 'Đến vào buổi sáng sớm (5:00-8:00) để tránh nóng và đông đúc.',
          tags: ['Thời gian'],
        ),
        _TipItem(
          text: 'Tháng 3-8 là mùa du lịch đẹp nhất, nước biển trong xanh.',
          tags: ['Thời tiết'],
        ),
        _TipItem(
          text: 'Tránh đến vào tháng 10-11 vì mùa mưa bão.',
          tags: ['Lưu ý'],
        ),
      ],
    ),
    _TipSection(
      icon: Icons.directions_car_rounded,
      title: 'Di chuyển',
      color: AppColors.actionSecondary,
      tips: [
        _TipItem(
          text: 'Thuê xe máy từ trung tâm thành phố ~15 phút, chi phí 120k/ngày.',
          tags: ['Xe máy'],
        ),
        _TipItem(
          text: 'Grab/Be luôn sẵn sàng, thời gian đến khoảng 10-15 phút.',
          tags: ['Grab'],
        ),
        _TipItem(
          text: 'Bãi đỗ xe rộng rãi, miễn phí cho xe máy.',
          tags: ['Đỗ xe'],
        ),
      ],
    ),
    _TipSection(
      icon: Icons.restaurant_rounded,
      title: 'Ăn uống lân cận',
      color: SagePalette.sage500,
      tips: [
        _TipItem(
          text: 'Hàng bún bò ngay đầu bãi biển, mở từ 6:00 sáng, giá 30-40k.',
          tags: ['Bún bò', 'Sáng sớm'],
        ),
        _TipItem(
          text: 'Hải sản tươi sống: khu vực đường Hoàng Sa có nhiều nhà hàng tốt.',
          tags: ['Hải sản'],
        ),
      ],
    ),
    _TipSection(
      icon: Icons.info_outline_rounded,
      title: 'Lưu ý quan trọng',
      color: AppColors.statusWarning,
      tips: [
        _TipItem(
          text: 'Mang theo kem chống nắng SPF 50+ vì tia UV rất mạnh.',
          tags: ['An toàn'],
        ),
        _TipItem(
          text: 'Không bơi quá xa khu vực an toàn, chú ý cờ cảnh báo.',
          tags: ['An toàn'],
        ),
        _TipItem(
          text: 'Giữ vệ sinh biển, không xả rác bừa bãi.',
          tags: ['Môi trường'],
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return _sections.isEmpty
        ? EmptyState(type: EmptyStateType.noTrips)
        : ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.layoutSm),
            itemCount: _sections.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.space2),
            itemBuilder: (_, i) {
              final section = _sections[i];
              final isExpanded = _expandedSections.contains(i);
              return _TipAccordion(
                section: section,
                isExpanded: isExpanded,
                onToggle: () => setState(() {
                  isExpanded
                      ? _expandedSections.remove(i)
                      : _expandedSections.add(i);
                }),
              );
            },
          );
  }
}

class _TipSection {
  const _TipSection({
    required this.icon,
    required this.title,
    required this.color,
    required this.tips,
  });
  final IconData icon;
  final String title;
  final Color color;
  final List<_TipItem> tips;
}

class _TipItem {
  const _TipItem({required this.text, this.tags = const []});
  final String text;
  final List<String> tags;
}

class _TipAccordion extends StatelessWidget {
  const _TipAccordion({
    required this.section,
    required this.isExpanded,
    required this.onToggle,
  });

  final _TipSection section;
  final bool isExpanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: AppRadius.cardBorder,
        border: Border.all(
          color: isExpanded ? section.color.withValues(alpha: 0.4) : AppColors.borderDefault,
          width: isExpanded ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        children: [
          // ── Header ──
          InkWell(
            onTap: onToggle,
            borderRadius: AppRadius.cardBorder,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.space4),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: section.color.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(section.icon, color: section.color, size: 18),
                  ),
                  const SizedBox(width: AppSpacing.space3),
                  Expanded(
                    child: Text(
                      section.title,
                      style: AppTextStyles.bodyMd.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Text(
                    '${section.tips.length} mẹo',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space2),
                  AnimatedRotation(
                    turns: isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textSecondary,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Tips list (animated) ──
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                const Divider(height: 1, thickness: 1),
                ...section.tips.asMap().entries.map((e) {
                  final tip = e.value;
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.layoutSm,
                      AppSpacing.space3,
                      AppSpacing.layoutSm,
                      0,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(top: 6),
                          decoration: BoxDecoration(
                            color: section.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tip.text,
                                style: AppTextStyles.bodyMd.copyWith(
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              if (tip.tags.isNotEmpty) ...[
                                const SizedBox(height: AppSpacing.space2),
                                Wrap(
                                  spacing: AppSpacing.space1,
                                  children: tip.tags
                                      .map((t) => TagChip(
                                            label: t,
                                            variant: TagChipVariant.displayOnly,
                                          ))
                                      .toList(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: AppSpacing.space4),
              ],
            ),
            crossFadeState: isExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}

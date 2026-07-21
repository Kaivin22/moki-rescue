import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../../domain/models/vip_plan.dart';
import '../providers/vip_providers.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

/// SCREEN-VIP: VIPScreen — So sánh Free vs VIP + chọn gói
class VipScreen extends ConsumerStatefulWidget {
  const VipScreen({super.key});

  @override
  ConsumerState<VipScreen> createState() => _VipScreenState();
}

class _VipScreenState extends ConsumerState<VipScreen> {
  VipPlan _selectedPlan = VipPlan.monthly;

  @override
  Widget build(BuildContext context) {
    final isVip = ref.watch(isVipProvider);
    final profile = ref.watch(currentProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('VIP Premium',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Hero banner ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadius.cardBorder,
              ),
              child: Column(
                children: [
                  const Text('👑', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: AppSpacing.space2),
                  Text(
                    isVip ? 'Bạn đang là VIP!' : 'Nâng cấp lên VIP',
                    style: AppTextStyles.h3.copyWith(
                        color: Colors.white, fontWeight: FontWeight.w800),
                  ),
                  if (isVip && profile?.vipGrantedUntil != null)
                    Text(
                      'Hết hạn: ${_formatDate(profile!.vipGrantedUntil!)}',
                      style: AppTextStyles.bodyMd
                          .copyWith(color: Colors.white70),
                    ),
                  if (!isVip)
                    Text(
                      'Mở khóa toàn bộ tính năng cao cấp',
                      style: AppTextStyles.bodyMd
                          .copyWith(color: Colors.white70),
                    ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Feature comparison ──
            _SectionTitle('Tính năng'),
            const SizedBox(height: AppSpacing.space3),
            _FeatureTable(),

            const SizedBox(height: AppSpacing.layoutMd),

            if (!isVip) ...[
              // ── Plan selector ──
              _SectionTitle('Chọn gói'),
              const SizedBox(height: AppSpacing.space3),
              ...VipPlan.plans.map((plan) => Padding(
                    padding:
                        const EdgeInsets.only(bottom: AppSpacing.space2),
                    child: _PlanCard(
                      plan: plan,
                      isSelected: _selectedPlan.id == plan.id,
                      onTap: () => setState(() => _selectedPlan = plan),
                    ),
                  )),

              const SizedBox(height: AppSpacing.layoutMd),

              AppButton(
                label: 'Nâng cấp — ${_selectedPlan.priceFormatted}',
                onPressed: () {
                  ref.read(selectedPlanProvider.notifier).state =
                      _selectedPlan;
                  context.push(AppRoutes.payment);
                },
              ),
            ],

            const SizedBox(height: AppSpacing.layoutMd),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
      );
}

class _FeatureTable extends StatelessWidget {
  const _FeatureTable();

  static const _rows = [
    ('AI chat', '5 tin/ngày', 'Không giới hạn'),
    ('Xuất PDF', '❌', '✅'),
    ('Quảng cáo', 'Có', 'Không có'),
    ('Hỗ trợ', 'Thông thường', 'Ưu tiên'),
    ('Badge VIP', '❌', '✅'),
  ];

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderDefault),
          borderRadius: AppRadius.cardBorder,
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space4, vertical: AppSpacing.space3),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  const Expanded(child: SizedBox()),
                  SizedBox(
                    width: 80,
                    child: Text('Free',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodySm
                            .copyWith(fontWeight: FontWeight.w600)),
                  ),
                  SizedBox(
                    width: 80,
                    child: Text('VIP',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.bodySm.copyWith(
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFFFA500))),
                  ),
                ],
              ),
            ),
            // Rows
            ..._rows.asMap().entries.map((entry) {
              final isLast = entry.key == _rows.length - 1;
              final row = entry.value;
              return Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space4,
                    vertical: AppSpacing.space3),
                decoration: BoxDecoration(
                  border: isLast
                      ? null
                      : Border(
                          bottom: BorderSide(color: AppColors.borderDefault)),
                ),
                child: Row(
                  children: [
                    Expanded(
                        child: Text(row.$1,
                            style: AppTextStyles.bodyMd)),
                    SizedBox(
                      width: 80,
                      child: Text(row.$2,
                          textAlign: TextAlign.center,
                          style: AppTextStyles.bodyMd
                              .copyWith(color: AppColors.textSecondary)),
                    ),
                    SizedBox(
                      width: 80,
                      child: Text(row.$3,
                          textAlign: TextAlign.center,
                          style: AppTextStyles.bodyMd.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppColors.statusSuccess)),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      );
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.plan,
    required this.isSelected,
    required this.onTap,
  });

  final VipPlan plan;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.all(AppSpacing.space4),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFFFFF8E1)
                : AppColors.backgroundCard,
            borderRadius: AppRadius.cardBorder,
            border: Border.all(
              color: isSelected
                  ? const Color(0xFFFFA500)
                  : AppColors.borderDefault,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFFFFA500)
                        : AppColors.borderDefault,
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? const Center(
                        child: CircleAvatar(
                          radius: 5,
                          backgroundColor: Color(0xFFFFA500),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(plan.name,
                        style: AppTextStyles.bodyMd
                            .copyWith(fontWeight: FontWeight.w700)),
                    Text(plan.durationLabel,
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              Text(
                plan.priceFormatted,
                style: AppTextStyles.h4.copyWith(
                    color: const Color(0xFFFFA500),
                    fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      );
}
